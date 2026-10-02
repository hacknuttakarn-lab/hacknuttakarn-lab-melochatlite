Melo Chat Lite - Exclude Backups V23

Changes:
- tsconfig.json: exclude backups/ from TypeScript checks.
- .gitignore: ignore backups/ so future backup copies are not added to Git.

After extracting this overlay into the project root, run:

cd D:\project\melochat-web-lite
npx tsc --noEmit
npm run build

Because backups/ was already committed previously, run this ONCE to stop tracking existing backup files without deleting them locally:

git rm -r --cached backups
git add .gitignore tsconfig.json
git commit -m "Exclude backup files from TypeScript and Git"
git push origin main

Note: git rm --cached does NOT delete the local backups/ folder.
