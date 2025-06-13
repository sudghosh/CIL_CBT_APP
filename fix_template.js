// This script fixes the sample questions template file
// Run with Node.js: node fix_template.js

const fs = require('fs');
const path = require('path');

// Correct template content
const templateContent = `question_text,question_type,default_difficulty_level,paper_id,section_id,subsection_id,correct_option_index,option_0,option_1,option_2,option_3,explanation,valid_until
What is the capital of France?,MCQ,Easy,1,1,1,0,Paris,London,Berlin,Rome,Paris is the capital of France.,31-12-9999
Which planet is known as the Red Planet?,MCQ,Medium,1,1,2,1,Earth,Mars,Jupiter,Venus,Mars is often called the Red Planet.,31-12-9999
Is the sky blue?,True/False,Easy,1,1,1,0,True,False,,,The sky appears blue due to Rayleigh scattering.,31-12-9999
`;

// Paths to fix
const paths = [
  path.join(__dirname, 'samplequestions_template.csv'),
  path.join(__dirname, 'frontend', 'public', 'assets', 'samplequestions_template.csv')
];

// Fix each path
let fixCount = 0;
paths.forEach(filePath => {
  try {
    console.log(`Fixing template at: ${filePath}`);
    fs.writeFileSync(filePath, templateContent, 'utf8');
    console.log(`✅ Successfully fixed: ${filePath}`);
    fixCount++;
  } catch (err) {
    console.error(`❌ Error fixing ${filePath}:`, err.message);
  }
});

console.log(`\nSummary: Fixed ${fixCount} of ${paths.length} template files.`);
console.log('After running this script, try uploading the template again with your questions.');
