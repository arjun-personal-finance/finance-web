# Setting Up Separate Repository for Web App

Follow these steps to push the web app to its own repository and exclude it from the main finance-android repo.

## Step 1: Create a New GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `finance-web` or `personal-finance-web`)
3. **Do NOT** initialize it with a README, .gitignore, or license (since we already have files)
4. Copy the repository URL (e.g., `https://github.com/arjun-personal-finance/finance-web.git`)

## Step 2: Add Remote and Push

From the `web-app` directory, run:

```bash
cd web-app
git remote add origin https://github.com/arjun-personal-finance/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR-REPO-NAME` with your actual repository name.

## Step 3: Remove web-app from Main Repository

From the main repository root:

```bash
# Remove web-app from git tracking (but keep files locally)
git rm -r --cached web-app

# Commit the removal
git commit -m "Move web-app to separate repository"

# Push to finance-android
git push origin main
```

The `web-app/` folder is now in `.gitignore`, so it won't be tracked in the main repo anymore.

## Step 4: Verify

- Check that web-app is in a separate repo: Visit your new GitHub repository
- Check that web-app is excluded from main repo: The main repo should no longer show web-app files

## Future Workflow

### Working on Web App:
```bash
cd web-app
# Make changes
git add .
git commit -m "Your changes"
git push
```

### Working on Android App:
```bash
# From root directory
# Make changes
git add .
git commit -m "Your changes"
git push
```

Both repositories are now independent!

