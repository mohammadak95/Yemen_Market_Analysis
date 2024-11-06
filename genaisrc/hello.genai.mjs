import { exec } from 'child_process';

$`Write a short poem in code.`
const repoPath = '/Users/mohammmadalakkaoui/Documents/GitHub/Yemen_Market_Analysis';

exec(`cd ${repoPath} && git add . && git commit -m "Automated commit" && git push`, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
});