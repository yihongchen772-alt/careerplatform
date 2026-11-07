# 部署到新加坡服务器

中国大陆打不开 `*.vercel.app`，所以线上版本部署在自己的服务器和域名上。
数据库仍用 Neon（新加坡），文件保存在服务器磁盘的 `data/uploads`。

## 服务器要求
- 新加坡机房，Ubuntu 22.04 或 24.04，内存至少 2GB，开放 22、80、443 端口。
- 域名的 A 记录指向服务器 IP。

## 首次部署
```sh
curl -fsSL https://get.docker.com | sh
git clone https://github.com/yihongchen772-alt/careerplatform.git
cd careerplatform && git switch <要部署的分支>
cp .env.example .env   # 填好 DOMAIN、DATABASE_URL、NEXTAUTH_SECRET、CRON_SECRET 等
docker compose up -d --build
```
容器启动时会自动执行数据库迁移。证书由 Caddy 自动申请。

内存只有 2GB 时构建可能失败，先加 2GB 交换空间：
```sh
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

## 迁移旧文件
把 Vercel Blob 里的文件搬到服务器。不加 `--apply` 时只检查，不写入：
```sh
docker compose exec app node scripts/migrate-blobs.mjs
docker compose exec app node scripts/migrate-blobs.mjs --apply
```

## 每日提醒
用 `crontab -e` 添加，把 `<...>` 换成实际值：
```
0 1 * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://<DOMAIN>/api/cron/reminders
```

## 更新
```sh
git pull && docker compose up -d --build
```

## 备份
`data/uploads` 只存在这台服务器上，要定期备份，否则服务器出问题时文件会丢失。
