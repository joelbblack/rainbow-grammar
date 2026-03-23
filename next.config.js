/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

---

**File 5 of 5**
Name it exactly: `.gitignore`
```
node_modules/
.next/
out/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.vercel
.DS_Store
Thumbs.db
