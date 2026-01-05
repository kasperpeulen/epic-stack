# Reset upstream-main Branch - Manual Completion Required

## Summary
The `upstream-main` branch needs to be reset to commit `bac7bd445d5d4c7c602399a842518f40ec591f2d` to match the upstream `epicweb-dev/epic-stack` repository.

## Status
✅ Local reset prepared  
⚠️  Remote push requires manual action (sandbox environment limitation)

## Current State
- **Local `upstream-main` branch**: ✅ Points to `bac7bd445d5d4c7c602399a842518f40ec591f2d`
- **Remote `origin/upstream-main` branch**: ❌ Still at `ee739f374f43526c885921839c1b9cde9c0997ba`

## Commits to Remove
- `ee739f374f43526c885921839c1b9cde9c0997ba` - Merge branch 'kasper/staging-app-per-pr'
- `1c0c94167c1bbc2eb5503c5bf129126feaaad0fc` - Create a staging environment deployment for pull requests
- `ef94b81297b667af1c249da70e8ad7fc600bbbe2` - Update app name in fly.toml to epic-rsc-stack

## Target Commit
`bac7bd445d5d4c7c602399a842518f40ec591f2d` - Migrate server code to `server/index.ts` and simplify processes (#1066)

## Manual Steps Required

### Option 1: Using the provided script

Run the provided script with repository write access:

```bash
./reset-upstream-main.sh
```

### Option 2: Manual commands

Alternatively, run these commands manually with appropriate GitHub write access:

```bash
# Fetch the latest
git fetch origin

# Checkout upstream-main
git checkout upstream-main

# Reset to target commit
git reset --hard bac7bd445d5d4c7c602399a842518f40ec591f2d

# Force push to remote
git push origin upstream-main --force
```

## Verification

After completing the above steps, verify the reset:

```bash
git ls-remote origin upstream-main
# Should show: bac7bd445d5d4c7c602399a842518f40ec591f2d

git log --oneline upstream-main -5
# Should NOT include the three commits listed above
```

## Why Manual Action is Needed

The sandbox environment has authentication constraints that prevent automated force-push operations to branches other than the PR branch. The local repository state has been prepared correctly, but the remote update requires manual intervention.
