/**
 * Cleanup script for authentication debugging
 * 
 * This utility should be used to clean up debug logs once the issues are resolved
 * Run this function in a development environment to remove all debug statements
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import glob from 'glob';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const globAsync = promisify(glob);

/**
 * Pattern for debug logs that should be removed
 */
const DEBUG_PATTERNS = [
  /console\.log\(\s*['"`]\[DEBUG\](?:\[NavGuard\]|\[AdminRoute\]|\[Redirect\]|\[HardRedirect\])?.*?\);?$/gm,
  /console\.log\(\s*["'`]\[DEBUG\].*?\);?$/gm,
  /import\s*\{\s*logAuthState\s*\}\s*from\s*['"`]\.\.\/utils\/authDebugger['"`]\;/g,
  /isInitialMount\.current/g
];

/**
 * Files that should be excluded from cleanup
 */
const EXCLUDE_FILES = [
  'authDebugger.ts',
  'devTools.ts'
];

async function cleanupDebugLogs() {
  try {
    // Find all TypeScript and TSX files
    const files = await globAsync('src/**/*.{ts,tsx}', {
      ignore: EXCLUDE_FILES.map(file => `**/${file}`)
    });
    
    console.log(`Found ${files.length} files to check for debug logs`);
    
    let filesModified = 0;
    let logsRemoved = 0;
    
    // Process each file
    for (const filePath of files) {
      const content = await readFileAsync(filePath, 'utf8');      let newContent = content;
      let fileModified = false;
      
      // Apply all patterns
      for (const pattern of DEBUG_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          // For each match, replace it with empty string
          newContent = newContent.replace(pattern, '');
          logsRemoved += matches.length;
          fileModified = true;
        }
      }
      
      // Clean up empty lines left after removing debug statements
      newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      // Clean up empty if blocks
      newContent = newContent.replace(/if\s*\(\s*isDevMode\(\)\s*\)\s*\{\s*\}/g, '');
      
      // Save the file if modified
      if (fileModified) {
        await writeFileAsync(filePath, newContent, 'utf8');
        filesModified++;
        console.log(`Cleaned ${filePath}`);
      }
    }
    
    console.log(`Cleanup complete: ${logsRemoved} logs removed from ${filesModified} files`);
  } catch (error) {
    console.error('Error cleaning up debug logs:', error);
  }
}

// Only execute in development mode
if (process.env.NODE_ENV === 'development') {
  cleanupDebugLogs();
} else {
  console.log('Cleanup script should only be run in development mode');
}
