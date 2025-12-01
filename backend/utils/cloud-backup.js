// Cloud backup utility - Simple local backup
// Note: This will be replaced with Supabase (external database)
const fs = require('fs');
const path = require('path');

/**
 * Backup database to local file (temporary - will be replaced with Supabase)
 */
const backupToCloud = async (backupData) => {
  try {
    // Store in local backup.json (will be lost on ephemeral storage)
    const backupPath = path.join(__dirname, '../database/backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log('💾 Local backup saved (temporary - Supabase will replace this)');
    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return false;
  }
};

/**
 * Restore database from local file (temporary - will be replaced with Supabase)
 */
const restoreFromCloud = async () => {
  try {
    // Check local backup.json file (may not exist on fresh deployment)
    const backupPath = path.join(__dirname, '../database/backup.json');
    if (fs.existsSync(backupPath)) {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      console.log('📦 Found local backup.json file');
      return backupData;
    }
    
    console.log('📄 No backup found');
    return null;
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return null;
  }
};

/**
 * Get cloud backup recommendation
 */
const getCloudBackupRecommendation = () => {
  return {
    issue: 'Ephemeral storage - database file is lost on restart/redeploy (Render free tier, Heroku, etc.)',
    currentStatus: '🔄 Migrating to Supabase (external database)',
    solutions: [
      {
        name: 'Supabase (CURRENT SETUP)',
        description: 'Free PostgreSQL database - data persists forever',
        cost: 'FREE forever',
        status: '🔄 Setting up...',
        implementation: 'External database - no data loss'
      }
    ]
  };
};

module.exports = {
  backupToCloud,
  restoreFromCloud,
  getCloudBackupRecommendation
};

