# Agent Instructions

## Desktop Build & Release Workflow

When the user asks to build and/or release the desktop apps, you MUST run all unit tests first and verify they pass before proceeding with the build. Run `pnpm test` from the project root. If any test fails, stop and report the failures — do not proceed with the build until tests pass.
