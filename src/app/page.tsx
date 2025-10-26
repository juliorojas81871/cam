'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Pagination,
  Stack,
  SelectChangeEvent
} from '@mui/material';
import { useData } from '@/contexts/DataContext';

const ITEMS_PER_PAGE = 100;

type SortField = 'name' | 'address' | 'constructionDate' | 'ownedOrLeased';
type SortDirection = 'asc' | 'desc';

interface CombinedProperty {
  id: string;
  name: string;
  address: string;
  constructionDate: string;
  ownedOrLeased: string;
  source: string;
}

export default function PropertiesPage() {
  const { owned, leases, loading, error } = useData();

  // Filtering states
  const [nameFilter, setNameFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('owned');

  // Sorting states
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Combine and transform data
  const combinedProperties = useMemo<CombinedProperty[]>(() => {
    const properties: CombinedProperty[] = [];

    // Process owned
    owned.forEach(building => {
      properties.push({
        id: `building-${building.id}`,
        name: (building.cleanedBuildingName || building.realPropertyAssetName || '') as string,
        address: `${building.streetAddress || ''}, ${building.city || ''}, ${building.state || ''} ${building.zipCode || ''}`,
        constructionDate: (building.constructionDate || 'N/A') as string,
        ownedOrLeased: building.ownedOrLeased === 'F' ? 'Owned' : 'Leased',
        source: 'building'
      });
    });

    // Process leases
    leases.forEach(lease => {
      properties.push({
        id: `lease-${lease.id}`,
        name: (lease.cleanedBuildingName || lease.realPropertyAssetName || '') as string,
        address: `${lease.streetAddress || ''}, ${lease.city || ''}, ${lease.state || ''} ${lease.zipCode || ''}`,
        constructionDate: (lease.constructionDate || 'N/A') as string,
        ownedOrLeased: 'Leased',
        source: 'lease'
      });
    });

    return properties;
  }, [owned, leases]);

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    const filtered = combinedProperties.filter(property => {
      const nameMatch = property.name.toLowerCase().includes(nameFilter.toLowerCase());
      const addressMatch = property.address.toLowerCase().includes(addressFilter.toLowerCase());
      const ownershipMatch =
        (ownershipFilter === 'owned' && property.ownedOrLeased === 'Owned') ||
        (ownershipFilter === 'leased' && property.ownedOrLeased === 'Leased');

      return nameMatch && addressMatch && ownershipMatch;
    });

    // Sort properties
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle construction date sorting (consider 'N/A' as lowest value)
      if (sortField === 'constructionDate') {
        if (aValue === 'N/A' && bValue === 'N/A') return 0;
        if (aValue === 'N/A') return sortDirection === 'asc' ? -1 : 1;
        if (bValue === 'N/A') return sortDirection === 'asc' ? 1 : -1;

        const aYear = parseInt(aValue);
        const bYear = parseInt(bValue);
        return sortDirection === 'asc' ? aYear - bYear : bYear - aYear;
      }

      // String comparison for other fields
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [combinedProperties, nameFilter, addressFilter, ownershipFilter, sortField, sortDirection]);

  // Paginated properties
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedProperties.slice(startIndex, endIndex);
  }, [filteredAndSortedProperties, currentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedProperties.length / ITEMS_PER_PAGE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleOwnershipFilterChange = (event: SelectChangeEvent) => {
    setOwnershipFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
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
        Properties Overview
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        View, filter, and sort all owned and leased properties
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Filter by Name"
              variant="outlined"
              size="small"
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value);
                handleFilterChange();
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Filter by Address"
              variant="outlined"
              size="small"
              value={addressFilter}
              onChange={(e) => {
                setAddressFilter(e.target.value);
                handleFilterChange();
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Ownership Type</InputLabel>
              <Select
                value={ownershipFilter}
                label="Ownership Type"
                onChange={handleOwnershipFilterChange}
              >
                <MenuItem value="owned">Owned</MenuItem>
                <MenuItem value="leased">Leased</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedProperties.length} of {filteredAndSortedProperties.length} properties 
          (Page {currentPage} of {totalPages})
        </Typography>
      </Box>

      {/* Properties Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'address'}
                  direction={sortField === 'address' ? sortDirection : 'asc'}
                  onClick={() => handleSort('address')}
                >
                  Address
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'constructionDate'}
                  direction={sortField === 'constructionDate' ? sortDirection : 'asc'}
                  onClick={() => handleSort('constructionDate')}
                >
                  Construction Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'ownedOrLeased'}
                  direction={sortField === 'ownedOrLeased' ? sortDirection : 'asc'}
                  onClick={() => handleSort('ownedOrLeased')}
                >
                  Ownership
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProperties.map((property) => (
              <TableRow key={property.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {property.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {property.address}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {property.constructionDate}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={property.ownedOrLeased}
                    color={property.ownedOrLeased === 'Owned' ? 'primary' : 'secondary'}
                    size="small"
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

      {filteredAndSortedProperties.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No properties found matching your filters.
          </Typography>
        </Box>
      )}
    </Box>
  );
}