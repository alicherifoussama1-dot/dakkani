-- Per-product subdomain: roya.afnane.store opens the product "ensemble-roya"
-- of the store whose custom domain is afnane.store. The hosting provisioner
-- (~/acme-tool/subdomains.js) creates the cPanel subdomain + certificate and
-- reports progress in subdomain_status (pending | active | error).
alter table products add column if not exists subdomain text;
alter table products add column if not exists subdomain_status text;
create unique index if not exists products_store_subdomain_key
  on products (store_id, subdomain) where subdomain is not null;
