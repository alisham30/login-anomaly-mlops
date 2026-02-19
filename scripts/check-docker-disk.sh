#!/bin/bash
# Run on EC2 to see why Docker build fails with "No space left" when root has 13G free
echo "=== Root and /var ==="
df -h /
df -h /var
df -h /var/lib/docker 2>/dev/null || true
echo ""
echo "=== Inodes (can cause Errno 28 too) ==="
df -i /
echo ""
echo "=== Docker root and storage ==="
docker info 2>/dev/null | grep -E "Docker Root Dir|Storage Driver"
echo ""
echo "=== Docker disk usage ==="
docker system df 2>/dev/null || true
