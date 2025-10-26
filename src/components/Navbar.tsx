'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';

const Navbar: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          CAM Ventures
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            component={Link}
            href="/"
            startIcon={<HomeIcon />}
          >
            Properties
          </Button>
          <Button
            color="inherit"
            component={Link}
            href="/map"
            startIcon={<MapIcon />}
          >
            Map
          </Button>
          <Button
            color="inherit"
            component={Link}
            href="/owned"
            startIcon={<BusinessIcon />}
          >
            Owned Properties
          </Button>
          <Button
            color="inherit"
            component={Link}
            href="/leased"
            startIcon={<AssignmentIcon />}
          >
            Leased Properties
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

