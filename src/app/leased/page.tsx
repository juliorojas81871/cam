'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Stack,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip as MuiTooltip,
} from '@mui/material';
import { useData } from '@/contexts/DataContext';
import { format, parseISO, isValid } from 'date-fns';

const ITEMS_PER_PAGE = 50;

// Helper function to parse Excel serial date
const parseExcelDate = (serial: number): Date | null => {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info;
};

// Helper function to format dates consistently
const formatDate = (dateValue: any): string => {
  if (!dateValue) return 'N/A';

  let date: Date;
  if (typeof dateValue === 'string') {
    date = parseISO(dateValue);
  } else if (typeof dateValue === 'number') {
    const parsed = parseExcelDate(dateValue);
    if (!parsed) return 'N/A';
    date = parsed;
  } else {
    date = new Date(dateValue);
  }

  if (!isValid(date)) return 'N/A';
  return format(date, 'MMM dd, yyyy');
};

// Helper function to get date for calculations
const getDateValue = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  let date: Date;
  if (typeof dateValue === 'string') {
    date = parseISO(dateValue);
  } else if (typeof dateValue === 'number') {
    const parsed = parseExcelDate(dateValue);
    if (!parsed) return null;
    date = parsed;
  } else {
    date = new Date(dateValue);
  }

  return isValid(date) ? date : null;
};

interface ProcessedLease {
  id: number | string;
  leaseNumber: string;
  buildingName: string;
  city: string;
  state: string;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  effectiveDateFormatted: string;
  expirationDateFormatted: string;
  duration: number;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  address: string;
  status: string;
}

export default function LeasedPropertiesPage() {
  const { leases, loading, error } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter and process lease data
  const processedLeases = useMemo<ProcessedLease[]>(() => {
    const filtered = leases.filter(lease => {
      const hasLeaseId = lease.leaseNumber || lease.id || lease.realPropertyAssetName;
      const hasEffectiveDate = lease.leaseEffectiveDate;
      const hasExpirationDate = lease.leaseExpirationDate;
      
      return hasLeaseId && hasEffectiveDate && hasExpirationDate;
    });
        
    return filtered
      .map((lease, index) => {
        const effectiveDateField = lease.leaseEffectiveDate;
        const expirationDateField = lease.leaseExpirationDate;
        
        const effectiveDate = getDateValue(effectiveDateField);
        const expirationDate = getDateValue(expirationDateField);
        
        if (!effectiveDate || !expirationDate) {
          return {
            id: lease.id || index,
            leaseNumber: (lease.leaseNumber || `LEASE-${index}`) as string,
            buildingName: (lease.cleanedBuildingName || lease.realPropertyAssetName || 'Unknown Building') as string,
            city: (lease.city || 'Unknown') as string,
            state: (lease.state || 'Unknown') as string,
            effectiveDate: null,
            expirationDate: null,
            effectiveDateFormatted: 'Invalid Date',
            expirationDateFormatted: 'Invalid Date',
            duration: 0,
            daysRemaining: 0,
            isExpired: false,
            isExpiringSoon: false,
            address: `${lease.streetAddress || ''}, ${lease.city || ''}, ${lease.state || ''} ${lease.zipCode || ''}`.trim(),
            status: 'No Dates'
          };
        }

        const duration = (expirationDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24);
        const today = new Date();
        const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isExpired = expirationDate < today;
        const isExpiringSoon = daysRemaining <= 365 && daysRemaining > 0;

        return {
          id: lease.id || index,
          leaseNumber: (lease.leaseNumber || `LEASE-${index}`) as string,
          buildingName: (lease.cleanedBuildingName || lease.realPropertyAssetName || 'Unknown Building') as string,
          city: (lease.city || 'Unknown') as string,
          state: (lease.state || 'Unknown') as string,
          effectiveDate,
          expirationDate,
          effectiveDateFormatted: formatDate(effectiveDateField),
          expirationDateFormatted: formatDate(expirationDateField),
          duration,
          daysRemaining,
          isExpired,
          isExpiringSoon,
          address: `${lease.streetAddress || ''}, ${lease.city || ''}, ${lease.state || ''} ${lease.zipCode || ''}`.trim(),
          status: isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.effectiveDate?.getTime() || 0) - (b.effectiveDate?.getTime() || 0));
  }, [leases]);

  // Filter leases based on search term and status
  const filteredLeases = useMemo(() => {
    let filtered = processedLeases;

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lease =>
        lease.buildingName.toLowerCase().includes(term) ||
        lease.city.toLowerCase().includes(term) ||
        lease.state.toLowerCase().includes(term) ||
        lease.leaseNumber.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lease => lease.status === statusFilter);
    }

    return filtered;
  }, [processedLeases, searchTerm, statusFilter]);

  // Paginated data for table
  const paginatedLeases = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeases.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLeases, currentPage]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = processedLeases.length;
    const expired = processedLeases.filter(l => l.isExpired).length;
    const expiringSoon = processedLeases.filter(l => l.isExpiringSoon).length;
    const active = total - expired - expiringSoon;

    return { total, expired, expiringSoon, active };
  }, [processedLeases]);

  const totalPages = Math.ceil(filteredLeases.length / ITEMS_PER_PAGE);

  const handlePageChange = (_event: unknown, value: number) => {
    setCurrentPage(value);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Leased Properties Dashboard
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Comprehensive lease management and timeline visualization
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Leases
              </Typography>
              <Typography variant="h4" component="div">
                {summaryStats.total.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Leases
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {summaryStats.active.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Expiring Soon
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {summaryStats.expiringSoon.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Expired
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {summaryStats.expired.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Table */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Lease Details Table
            </Typography>

            {/* Filters */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Search by building name, city, state, or lease number"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ flex: 1, minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Expiring Soon">Expiring Soon</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Results Summary */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {paginatedLeases.length} of {filteredLeases.length} leases
                (Page {currentPage} of {totalPages})
              </Typography>
            </Box>

            {/* Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Building Name</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Lease Number</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLeases.map((lease) => (
                    <TableRow key={lease.id} hover>
                      <TableCell>
                        <MuiTooltip title={lease.address}>
                          <Typography variant="body2" fontWeight="medium">
                            {lease.buildingName}
                          </Typography>
                        </MuiTooltip>
                      </TableCell>
                      <TableCell>{lease.city}</TableCell>
                      <TableCell>{lease.state}</TableCell>
                      <TableCell>{lease.leaseNumber}</TableCell>
                      <TableCell>{lease.effectiveDateFormatted}</TableCell>
                      <TableCell>{lease.expirationDateFormatted}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={lease.status}
                          color={lease.status === 'Expired' ? 'error' : 
                                 lease.status === 'Expiring Soon' ? 'warning' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <Stack spacing={2} alignItems="center" sx={{ mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {processedLeases.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No valid lease data found.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

