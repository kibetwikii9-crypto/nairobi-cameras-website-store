/**
 * Kill process on port 5000
 * Run: node kill-port.js
 */

const { exec } = require('child_process');
const os = require('os');

const port = 5000;
const platform = os.platform();

let command;

if (platform === 'win32') {
  // Windows
  command = `netstat -ano | findstr :${port}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log(`❌ No process found on port ${port}`);
      return;
    }
    
    const lines = stdout.trim().split('\n');
    if (lines.length > 0) {
      const pid = lines[0].split(/\s+/).pop();
      console.log(`🔍 Found process ${pid} on port ${port}`);
      console.log(`🛑 Killing process...`);
      
      exec(`taskkill /PID ${pid} /F`, (killError, killStdout, killStderr) => {
        if (killError) {
          console.error('❌ Failed to kill process:', killError.message);
        } else {
          console.log('✅ Process killed successfully');
          console.log('💡 You can now run: npm start');
        }
      });
    } else {
      console.log(`❌ No process found on port ${port}`);
    }
  });
} else {
  // Linux/Mac
  command = `lsof -ti:${port}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log(`❌ No process found on port ${port}`);
      return;
    }
    
    const pid = stdout.trim();
    console.log(`🔍 Found process ${pid} on port ${port}`);
    console.log(`🛑 Killing process...`);
    
    exec(`kill -9 ${pid}`, (killError, killStdout, killStderr) => {
      if (killError) {
        console.error('❌ Failed to kill process:', killError.message);
      } else {
        console.log('✅ Process killed successfully');
        console.log('💡 You can now run: npm start');
      }
    });
  });
}



