'use client';

import { useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useData } from '@/contexts/DataContext';
import PropertyMap from '@/components/PropertyMap';

export default function OwnedPropertiesPage() {
  const { owned, loading, error } = useData();

  // Filter only owned properties
  const ownedProperties = useMemo(() => {
    return owned.filter(building => building.ownedOrLeased === 'F');
  }, [owned]);

  // Prepare data for construction date chart
  const constructionDateData = useMemo(() => {
    const dateGroups: Record<string, number> = {};

    ownedProperties.forEach(property => {
      const year = property.constructionDate;
      if (year && year !== 'N/A' && !isNaN(parseInt(year as string))) {
        const decade = Math.floor(parseInt(year as string) / 10) * 10;
        const decadeLabel = `${decade}s`;
        dateGroups[decadeLabel] = (dateGroups[decadeLabel] || 0) + 1;
      }
    });

    return Object.entries(dateGroups)
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade.localeCompare(b.decade));
  }, [ownedProperties]);

  // Prepare data for square footage comparison
  const squareFootageData = useMemo(() => {
    return ownedProperties
      .filter(property =>
        property.buildingRentableSquareFeet &&
        property.availableSquareFeet &&
        !isNaN(parseInt(property.buildingRentableSquareFeet as string)) &&
        !isNaN(parseInt(property.availableSquareFeet as string))
      )
      .map(property => {
        const rentable = parseInt(property.buildingRentableSquareFeet as string);
        const available = parseInt(property.availableSquareFeet as string);
        const utilized = Math.max(0, rentable - available);
        const name = (property.cleanedBuildingName || property.realPropertyAssetName || '') as string;

        return {
          name: name.length > 25 ? name.substring(0, 25) + '...' : name,
          fullName: name,
          rentable,
          available: Math.min(available, rentable),
          utilized
        };
      })
      .sort((a, b) => b.rentable - a.rentable)
      .slice(0, 20);
  }, [ownedProperties]);

  // Prepare data for utilization pie chart
  const utilizationData = useMemo(() => {
    const totalRentable = ownedProperties.reduce((sum, property) => {
      const rentable = parseInt((property.buildingRentableSquareFeet as string) || '0');
      return sum + rentable;
    }, 0);

    const totalAvailable = ownedProperties.reduce((sum, property) => {
      const available = parseInt((property.availableSquareFeet as string) || '0');
      return sum + available;
    }, 0);

    const utilized = totalRentable - totalAvailable;

    return [
      { name: 'Utilized Space', value: utilized, color: '#1976d2' },
      { name: 'Available Space', value: totalAvailable, color: '#dc004e' }
    ];
  }, [ownedProperties]);

  // Prepare map data
  const mapData = useMemo(() => {
    return ownedProperties.map(property => ({
      ...property,
      name: (property.cleanedBuildingName || property.realPropertyAssetName) as string,
      address: `${property.streetAddress || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipCode || ''}`
    }));
  }, [ownedProperties]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalProperties = ownedProperties.length;
    const totalRentableArea = ownedProperties.reduce((sum, property) => {
      return sum + (parseInt((property.buildingRentableSquareFeet as string) || '0'));
    }, 0);
    const totalAvailableArea = ownedProperties.reduce((sum, property) => {
      return sum + (parseInt((property.availableSquareFeet as string) || '0'));
    }, 0);
    const utilizationRate = totalRentableArea > 0 ?
      ((totalRentableArea - totalAvailableArea) / totalRentableArea * 100).toFixed(1) : '0';

    return {
      totalProperties,
      totalRentableArea: totalRentableArea.toLocaleString(),
      totalAvailableArea: totalAvailableArea.toLocaleString(),
      utilizationRate
    };
  }, [ownedProperties]);

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
        Owned Properties Dashboard
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Comprehensive analytics for federally owned properties
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Properties
              </Typography>
              <Typography variant="h4" component="div">
                {summaryStats.totalProperties}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Rentable Area
              </Typography>
              <Typography variant="h6" component="div">
                {summaryStats.totalRentableArea} sq ft
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Available Area
              </Typography>
              <Typography variant="h6" component="div">
                {summaryStats.totalAvailableArea} sq ft
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Utilization Rate
              </Typography>
              <Typography variant="h4" component="div" color="primary">
                {summaryStats.utilizationRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Construction Date Chart */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Properties by Construction Date (Decades)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={constructionDateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="decade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Space Utilization Pie Chart */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall Space Utilization
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent as number * 100).toFixed(1)}%`}
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${(value as number).toLocaleString()} sq ft`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Property Map */}
        <Grid size={{ xs: 12 }}>
          <PropertyMap properties={mapData} />
        </Grid>

        {/* Space Utilization by Property */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Space Utilization by Property (Top 20 Properties)
            </Typography>

            {/* Legend and Description under title */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#1976d2', borderRadius: 1 }} />
                <Typography variant="body2">Utilized Space</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: '#dc004e', borderRadius: 1 }} />
                <Typography variant="body2">Available Space</Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Stacked bars show total rentable space for each property. Taller bars indicate larger properties.
            </Typography>

            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                data={squareFootageData}
                margin={{ top: 20, right: 30, left: 80, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  height={100}
                  fontSize={11}
                  interval={0}
                />
                <YAxis
                  tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
                  label={{ value: 'Square Feet', angle: -90, position: 'insideLeft', dx: -20 }}
                  domain={[0, 'dataMax']}
                  tickMargin={15}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} sq ft`, name]}
                  labelFormatter={(label: string) => {
                    const item = squareFootageData.find(d => d.name === label);
                    return `Property: ${item?.fullName || label}`;
                  }}
                />
                <Bar
                  dataKey="utilized"
                  stackId="space"
                  name="Utilized Space"
                  fill="#1976d2"
                />
                <Bar
                  dataKey="available"
                  stackId="space"
                  name="Available Space"
                  fill="#dc004e"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {ownedProperties.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No owned properties found in the dataset.
          </Typography>
        </Box>
      )}
    </Box>
  );
}