// Diagnostic utility for tracking data loss issues
const fs = require('fs');
const path = require('path');

// Track database state over time
let databaseStateHistory = [];
const MAX_HISTORY = 100; // Keep last 100 states

// Record database state snapshot
const recordDatabaseState = async (Product, User, Order, dbPath) => {
  try {
    const productCount = await Product.count();
    const userCount = await User.count();
    const orderCount = await Order.count();
    
    let dbFileSize = 0;
    let dbFileExists = false;
    let dbFileModified = null;
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbFileSize = stats.size;
      dbFileExists = true;
      dbFileModified = stats.mtime;
    }
    
    const state = {
      timestamp: new Date().toISOString(),
      productCount,
      userCount,
      orderCount,
      dbPath,
      dbFileExists,
      dbFileSize,
      dbFileModified: dbFileModified ? dbFileModified.toISOString() : null,
      memoryUsage: process.memoryUsage()
    };
    
    databaseStateHistory.push(state);
    
    // Keep only last MAX_HISTORY entries
    if (databaseStateHistory.length > MAX_HISTORY) {
      databaseStateHistory = databaseStateHistory.slice(-MAX_HISTORY);
    }
    
    return state;
  } catch (error) {
    console.error('❌ Error recording database state:', error);
    return null;
  }
};

// Detect data loss
const detectDataLoss = (currentState, previousState) => {
  if (!previousState) return null;
  
  const issues = [];
  
  // Check for product loss
  if (currentState.productCount < previousState.productCount) {
    issues.push({
      type: 'PRODUCT_LOSS',
      severity: 'HIGH',
      message: `Products decreased from ${previousState.productCount} to ${currentState.productCount} (lost ${previousState.productCount - currentState.productCount} products)`,
      previousCount: previousState.productCount,
      currentCount: currentState.productCount,
      lost: previousState.productCount - currentState.productCount
    });
  }
  
  // Check for user loss
  if (currentState.userCount < previousState.userCount) {
    issues.push({
      type: 'USER_LOSS',
      severity: 'HIGH',
      message: `Users decreased from ${previousState.userCount} to ${currentState.userCount} (lost ${previousState.userCount - currentState.userCount} users)`,
      previousCount: previousState.userCount,
      currentCount: currentState.userCount,
      lost: previousState.userCount - currentState.userCount
    });
  }
  
  // Check for database path change
  if (currentState.dbPath !== previousState.dbPath) {
    issues.push({
      type: 'DATABASE_PATH_CHANGE',
      severity: 'CRITICAL',
      message: `Database path changed from ${previousState.dbPath} to ${currentState.dbPath}`,
      previousPath: previousState.dbPath,
      currentPath: currentState.dbPath
    });
  }
  
  // Check for database file disappearance
  if (previousState.dbFileExists && !currentState.dbFileExists) {
    issues.push({
      type: 'DATABASE_FILE_DELETED',
      severity: 'CRITICAL',
      message: `Database file was deleted: ${previousState.dbPath}`,
      previousPath: previousState.dbPath
    });
  }
  
  // Check for database file size decrease (unusual)
  if (currentState.dbFileExists && previousState.dbFileExists) {
    if (currentState.dbFileSize < previousState.dbFileSize * 0.5) {
      issues.push({
        type: 'DATABASE_FILE_SHRUNK',
        severity: 'HIGH',
        message: `Database file size decreased significantly from ${previousState.dbFileSize} to ${currentState.dbFileSize} bytes`,
        previousSize: previousState.dbFileSize,
        currentSize: currentState.dbFileSize
      });
    }
  }
  
  return issues.length > 0 ? issues : null;
};

// Get diagnostic report
const getDiagnosticReport = () => {
  return {
    currentState: databaseStateHistory[databaseStateHistory.length - 1] || null,
    previousState: databaseStateHistory[databaseStateHistory.length - 2] || null,
    history: databaseStateHistory,
    historyLength: databaseStateHistory.length,
    detectedIssues: databaseStateHistory.length >= 2 
      ? detectDataLoss(
          databaseStateHistory[databaseStateHistory.length - 1],
          databaseStateHistory[databaseStateHistory.length - 2]
        )
      : null
  };
};

// Check for multiple database files (not applicable for Supabase)
const findMultipleDatabaseFiles = (searchPaths) => {
  // Supabase uses cloud database, no local files to check
  return [];
};

// Verify data integrity
const verifyDataIntegrity = async (Product, User, Order) => {
  const issues = [];
  
  try {
    // Check for products with invalid categories
    const products = await Product.findAll({ raw: true });
    const validCategories = ['laptops', 'phones', 'cameras', 'audio', 'accessories', 'smart-home'];
    
    for (const product of products) {
      if (!validCategories.includes(product.category?.toLowerCase())) {
        issues.push({
          type: 'INVALID_CATEGORY',
          severity: 'MEDIUM',
          productId: product.id,
          productName: product.name,
          invalidCategory: product.category
        });
      }
      
      if (!product.name || product.name.trim() === '') {
        issues.push({
          type: 'MISSING_NAME',
          severity: 'HIGH',
          productId: product.id
        });
      }
      
      if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        issues.push({
          type: 'MISSING_IMAGES',
          severity: 'MEDIUM',
          productId: product.id,
          productName: product.name
        });
      }
    }
    
    // Check for users with invalid emails
    const users = await User.findAll({ raw: true });
    for (const user of users) {
      if (!user.email || !user.email.includes('@')) {
        issues.push({
          type: 'INVALID_EMAIL',
          severity: 'HIGH',
          userId: user.id,
          email: user.email
        });
      }
    }
    
  } catch (error) {
    issues.push({
      type: 'INTEGRITY_CHECK_ERROR',
      severity: 'HIGH',
      error: error.message
    });
  }
  
  return {
    timestamp: new Date().toISOString(),
    issues,
    issueCount: issues.length,
    status: issues.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND'
  };
};

module.exports = {
  recordDatabaseState,
  detectDataLoss,
  getDiagnosticReport,
  findMultipleDatabaseFiles,
  verifyDataIntegrity,
  databaseStateHistory
};


