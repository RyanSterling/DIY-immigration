@echo off
wsl -d Ubuntu bash -c "cd /mnt/c/Users/rober/projects/visaflow && docker compose --profile dev run --rm dev bash"
