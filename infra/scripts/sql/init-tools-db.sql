CREATE DATABASE IF NOT EXISTS bugtracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mantis_user'@'%' IDENTIFIED BY 'MantisInternal2026!';
GRANT ALL PRIVILEGES ON bugtracker.* TO 'mantis_user'@'%';

CREATE DATABASE IF NOT EXISTS nextcloud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'nc_user'@'%' IDENTIFIED BY 'NextcloudInternal2026!';
GRANT ALL PRIVILEGES ON nextcloud_db.* TO 'nc_user'@'%';

FLUSH PRIVILEGES;