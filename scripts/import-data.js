import XLSX from 'xlsx';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { count, eq } from 'drizzle-orm';
import { pgTable, serial, text, numeric, boolean } from 'drizzle-orm/pg-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cam_database',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

const connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
const client = postgres(connectionString);
const db = drizzle(client);

// Schema definitions
const owned = pgTable('owned', {
  id: serial('id').primaryKey(),
  locationCode: text('location_code'),
  realPropertyAssetName: text('real_property_asset_name'),
  installationName: text('installation_name'),
  ownedOrLeased: text('owned_or_leased'),
  gsaRegion: text('gsa_region'),
  streetAddress: text('street_address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  buildingRentableSquareFeet: numeric('building_rentable_square_feet'),
  availableSquareFeet: numeric('available_square_feet', { precision: 10, scale: 0 }).default('0'),
  constructionDate: text('construction_date'),
  congressionalDistrict: text('congressional_district'),
  congressionalDistrictRepresentativeName: text('congressional_district_representative_name'),
  buildingStatus: text('building_status'),
  realPropertyAssetType: text('real_property_asset_type'),
  cleanedBuildingName: text('cleaned_building_name'),
  addressInName: boolean('address_in_name').default(false),
});

const leases = pgTable('leases', {
  id: serial('id').primaryKey(),
  locationCode: text('location_code'),
  realPropertyAssetName: text('real_property_asset_name'),
  installationName: text('installation_name'),
  federalLeasedCode: text('federal_leased_code'),
  gsaRegion: text('gsa_region'),
  streetAddress: text('street_address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  buildingRentableSquareFeet: numeric('building_rentable_square_feet'),
  availableSquareFeet: numeric('available_square_feet', { precision: 10, scale: 0 }).default('0'),
  constructionDate: text('construction_date'),
  congressionalDistrict: text('congressional_district'),
  congressionalDistrictRepresentative: text('congressional_district_representative'),
  leaseNumber: text('lease_number'),
  leaseEffectiveDate: text('lease_effective_date'),
  leaseExpirationDate: text('lease_expiration_date'),
  realPropertyAssetType: text('real_property_asset_type'),
  cleanedBuildingName: text('cleaned_building_name'),
  addressInName: boolean('address_in_name').default(false),
});

const schema = { owned, leases };

// Data cleansing utilities
function hasAddressInName(name) {
  if (!name) return false;
  
  const addressPatterns = [
    /\d+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)/i,
    /\d+\s+[A-Za-z]+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)/i,
    /\d{3,5}\s+[A-Za-z]/,
    /,\s*\d{5}(-\d{4})?/,
    /(suite|ste|floor|fl|room|rm)\s*\d+/i,
  ];
  
  return addressPatterns.some(pattern => pattern.test(name));
}

function cleanBuildingName(name) {
  if (!name) return name;
  
  let cleaned = name.trim();
  
  const delimiters = [' - ', ' – ', ', ', ' / ', ': ', ' | ', ' @ ', ' at '];
  
  for (const delimiter of delimiters) {
    if (cleaned.includes(delimiter)) {
      const parts = cleaned.split(delimiter).map(part => part.trim());
      
      if (parts.length >= 2) {
        let bestPart = parts[0];
        let bestScore = scoreAsNonAddress(parts[0]);
        
        for (let i = 1; i < parts.length; i++) {
          const score = scoreAsNonAddress(parts[i]);
          if (score > bestScore) {
            bestPart = parts[i];
            bestScore = score;
          }
        }
        
        cleaned = bestPart;
        break;
      }
    }
  }
  
  cleaned = cleaned.replace(/,?\s*\d{5}(-\d{4})?\s*$/, '');
  cleaned = cleaned.replace(/,?\s*(suite|ste|floor|fl|room|rm)\s*\d+\s*$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[,\-\s]+|[,\-\s]+$/g, '');
  
  if (!cleaned || cleaned.length < 3) {
    return name;
  }
  
  return cleaned;
}

function scoreAsNonAddress(text) {
  if (!text || text.length < 2) return 0;
  
  let score = 10;
  
  if (/^\d/.test(text)) score -= 15;
  if (/\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)\b/i.test(text)) score -= 10;
  if (/\d{5}(-\d{4})?/.test(text)) score -= 20;
  if (/\b(center|centre|plaza|tower|building|complex|mall|square|park|place)\b/i.test(text)) score += 15;
  
  const capitalizedWords = text.match(/\b[A-Z][a-z]+/g);
  if (capitalizedWords && capitalizedWords.length > 1) score += 5;
  if (text.length < 5) score -= 5;
  
  return score;
}

function processRowData(row) {
  const assetName = row['Real Property Asset Name'] || '';
  
  return {
    ...row,
    cleanedBuildingName: cleanBuildingName(assetName),
    addressInName: hasAddressInName(assetName)
  };
}

// Read and parse Excel file
function readExcelFile(filename) {
  const filePath = join(__dirname, '..', filename);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  return jsonData;
}

// Convert Excel serial date to proper date string
function convertExcelDate(excelDate) {
  if (!excelDate || excelDate === '' || isNaN(excelDate)) {
    return null;
  }

  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + (parseInt(excelDate) * 24 * 60 * 60 * 1000));

  // Return in YYYY-MM-DD format
  return date.toISOString().split('T')[0];
}

// Handle availableSquareFeet to ensure it's numeric and defaults to 0
function parseAvailableSquareFeet(value) {
  if (!value || value === '' || value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Map Excel columns to database fields for buildings
function mapBuildingData(row) {
  return {
    locationCode: row['Location Code'],
    realPropertyAssetName: row['Real Property Asset Name'],
    installationName: row['Installation Name'],
    ownedOrLeased: row['Owned or Leased'],
    gsaRegion: row['GSA Region'],
    streetAddress: row['Street Address'],
    city: row['City'],
    state: row['State'],
    zipCode: row['Zip Code'],
    latitude: row['Latitude'] ? String(row['Latitude']) : null,
    longitude: row['Longitude'] ? String(row['Longitude']) : null,
    buildingRentableSquareFeet: row['Building Rentable Square Feet'] ? String(row['Building Rentable Square Feet']) : null,
    availableSquareFeet: parseAvailableSquareFeet(row['Available Square Feet']),
    constructionDate: row['Construction Date'],
    congressionalDistrict: row['Congressional District'],
    congressionalDistrictRepresentativeName: row['Congressional District Representative Name'],
    buildingStatus: row['Building Status'],
    realPropertyAssetType: row['Real Property Asset Type'],
    cleanedBuildingName: row.cleanedBuildingName,
    addressInName: row.addressInName,
  };
}

// Map Excel columns to database fields for leases
function mapLeaseData(row) {
  return {
    locationCode: row['Location Code'],
    realPropertyAssetName: row['Real Property Asset Name'],
    installationName: row['Installation Name'],
    federalLeasedCode: row['Federal Leased Code'],
    gsaRegion: row['GSA Region'],
    streetAddress: row['Street Address'],
    city: row['City'],
    state: row['State'],
    zipCode: row['Zip Code'],
    latitude: row['Latitude'] ? String(row['Latitude']) : null,
    longitude: row['Longitude'] ? String(row['Longitude']) : null,
    buildingRentableSquareFeet: row['Building Rentable Square Feet'] ? String(row['Building Rentable Square Feet']) : null,
    availableSquareFeet: parseAvailableSquareFeet(row['Available Square Feet']),
    constructionDate: row['Construction Date'],
    congressionalDistrict: row['Congressional District'],
    congressionalDistrictRepresentative: row['Congressional District Representative'],
    leaseNumber: row['Lease Number'],
    leaseEffectiveDate: convertExcelDate(row['Lease Effective Date']),
    leaseExpirationDate: convertExcelDate(row['Lease Expiration Date']),
    realPropertyAssetType: row['Real Property Asset type'],
    cleanedBuildingName: row.cleanedBuildingName,
    addressInName: row.addressInName,
  };
}

// Convert building data to lease format
function convertBuildingToLease(buildingRow) {
  return {
    locationCode: buildingRow['Location Code'],
    realPropertyAssetName: buildingRow['Real Property Asset Name'],
    installationName: buildingRow['Installation Name'],
    federalLeasedCode: null,
    gsaRegion: buildingRow['GSA Region'],
    streetAddress: buildingRow['Street Address'],
    city: buildingRow['City'],
    state: buildingRow['State'],
    zipCode: buildingRow['Zip Code'],
    latitude: buildingRow['Latitude'] ? String(buildingRow['Latitude']) : null,
    longitude: buildingRow['Longitude'] ? String(buildingRow['Longitude']) : null,
    buildingRentableSquareFeet: buildingRow['Building Rentable Square Feet'] ? String(buildingRow['Building Rentable Square Feet']) : null,
    availableSquareFeet: parseAvailableSquareFeet(buildingRow['Available Square Feet']),
    constructionDate: buildingRow['Construction Date'],
    congressionalDistrict: buildingRow['Congressional District'],
    congressionalDistrictRepresentative: buildingRow['Congressional District Representative Name'],
    leaseNumber: null,
    leaseEffectiveDate: null,
    leaseExpirationDate: null,
    realPropertyAssetType: buildingRow['Real Property Asset Type'],
    cleanedBuildingName: buildingRow.cleanedBuildingName,
    addressInName: buildingRow.addressInName,
  };
}

// Import buildings data - ONLY F (owned) buildings
async function importBuildings() {
  const rawData = readExcelFile('2025-5-23-iolp-buildings.xlsx');

  const processedData = rawData.map(processRowData);

  // Separate by ownership status
  const ownedBuildings = processedData.filter(row =>
    row['Owned or Leased'] && row['Owned or Leased'] === 'F'
  );
  const leasedBuildings = processedData.filter(row =>
    row['Owned or Leased'] && row['Owned or Leased'] === 'L'
  );

  // Clear existing tables
  await db.delete(schema.owned);
  await db.delete(schema.leases);

  const afterDeleteOwned = await db.select({ count: count() }).from(schema.owned);
  const afterDeleteLeases = await db.select({ count: count() }).from(schema.leases);

  if (afterDeleteOwned[0].count > 0 || afterDeleteLeases[0].count > 0) {
    throw new Error(`Failed to clear tables! Owned: ${afterDeleteOwned[0].count}, Leases: ${afterDeleteLeases[0].count}`);
  }
  console.log('Tables cleared successfully');

  // Import ONLY owned buildings (F) to owned table
  if (ownedBuildings.length > 0) {
    const ownedMappedData = ownedBuildings.map(mapBuildingData);

    const batchSize = 500;
    for (let i = 0; i < ownedMappedData.length; i += batchSize) {
      const batch = ownedMappedData.slice(i, i + batchSize);
      await db.insert(schema.owned).values(batch);
    }
  }

  // Import leased buildings (L) to LEASES table
  if (leasedBuildings.length > 0) {
    const leasedMappedData = leasedBuildings.map(convertBuildingToLease);

    const batchSize = 500;
    for (let i = 0; i < leasedMappedData.length; i += batchSize) {
      const batch = leasedMappedData.slice(i, i + batchSize);
      await db.insert(schema.leases).values(batch);
    }
  }
}

// Import leases data - OPTIMIZED for speed
async function importLeases() { 
  const rawData = readExcelFile('2025-5-23-iolp-leases.xlsx');

  const processedData = rawData.map(processRowData);

  // Get ALL existing lease addresses in one query
  const existingLeases = await db.select({
    id: schema.leases.id,
    streetAddress: schema.leases.streetAddress
  }).from(schema.leases);

  // Create a Map for O(1) lookup performance
  const existingAddressMap = new Map();
  existingLeases.forEach(lease => {
    existingAddressMap.set(lease.streetAddress, lease.id);
  });

  // Process lease records efficiently
  let newLeaseRecords = [];
  let updatedLeaseRecords = [];

  for (const leaseRow of processedData) {
    const mappedLease = mapLeaseData(leaseRow);

    const existingLeaseId = existingAddressMap.get(mappedLease.streetAddress);

    if (existingLeaseId) {
      updatedLeaseRecords.push({
        id: existingLeaseId,
        leaseNumber: mappedLease.leaseNumber,
        leaseEffectiveDate: mappedLease.leaseEffectiveDate,
        leaseExpirationDate: mappedLease.leaseExpirationDate,
        federalLeasedCode: mappedLease.federalLeasedCode
      });
    } else {
      newLeaseRecords.push(mappedLease);
    }
  }

  // Update existing lease records
  if (updatedLeaseRecords.length > 0) {
    const updateBatchSize = 100;
    for (let i = 0; i < updatedLeaseRecords.length; i += updateBatchSize) {
      const batch = updatedLeaseRecords.slice(i, i + updateBatchSize);

      const updatePromises = batch.map(updateData =>
        db.update(schema.leases)
          .set({
            leaseNumber: updateData.leaseNumber,
            leaseEffectiveDate: updateData.leaseEffectiveDate,
            leaseExpirationDate: updateData.leaseExpirationDate,
            federalLeasedCode: updateData.federalLeasedCode
          })
          .where(eq(schema.leases.id, updateData.id))
      );

      await Promise.all(updatePromises);
    }
  }

  // Import new lease records
  if (newLeaseRecords.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < newLeaseRecords.length; i += batchSize) {
      const batch = newLeaseRecords.slice(i, i + batchSize);
      await db.insert(schema.leases).values(batch);
    }
  }
}

// Main import function
async function main() {
  try {

    await importBuildings();
    await importLeases();
    console.log(`Import completed successfully`);

  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` ||
    (process.argv[1] && process.argv[1].endsWith('import-data.js'))) {
  main();
}

