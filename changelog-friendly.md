# Project updates

## 2026-11-17 20:50:49 Asia/Manila (UTC+08:00) - Full project review delivered as a PDF

Reviewed the whole project and created a detailed report in output explaining what works, what is still planned, how the work matches the vision and what should happen next. The applications build and their current tests pass; the local database connection also works.

The business tools are still to be built: the screens are starter pages and the product database setup file still needs controlled testing and separate approval to run. Corrected a few outdated documentation statements. No application features, private settings, database records or dependencies were changed, and nothing was committed or deployed.

Report: [reports/2026-11-17_20-44-11.md](reports/2026-11-17_20-44-11.md).

## 2026-11-08 22:58:39 Asia/Manila (UTC+08:00) - Product database structure prepared for review

Prepared the first three product-related definitions: categories, products and optional descriptive attributes. Products will receive permanent numbered SKUs, support editable selling units and keep draft/published/archived status separate from availability. Estimated costs remain clearly marked planning figures.

Prepared the database setup file and review notes, but did not run it. No live tables or products were added, and no public catalog or import feature is available yet. Existing server tests passed. The next task must review and explicitly authorize database testing/application.

Report: [reports/2026-11-08_22-50-06.md](reports/2026-11-08_22-50-06.md).

## 2026-11-08 21:35:06 Asia/Manila (UTC+08:00) - Complete database plan prepared for review

Planned how the catalog, staff, customers, orders, payments, materials, production work, artwork and conversations will fit together. Added six relationship diagrams and a step-by-step implementation plan. Checked the real Excel price list: its 36 products stay separate, and estimated costs remain private planning figures.

The plan preserves agreed order prices and individual payment history. Customers will not need accounts just to have records. Important business questions are listed before work starts; customer login/OTP and offline POS remain for later. Nothing was added to the database or applications. The diagrams still need a Mermaid viewer check.

Report: [reports/2026-11-08_21-24-00.md](reports/2026-11-08_21-24-00.md).

## 2026-11-08 08:15:33 Asia/Manila (UTC+08:00) ? Local database connection fixed

The settings named the correct project database, but that database and its dedicated login did not exist. The old administrator password worked, but the check correctly refused to use an administrator for the app. Created the project database and a restricted app login, then saved its settings privately. No existing passwords or unrelated databases were changed.

The database check now passes and both server health checks return HTTP 200. No business features were added. Temporary test servers were stopped.

Report: [reports/2026-11-08_08-13-27.md](reports/2026-11-08_08-13-27.md).

## 2026-11-08 05:09:32 Asia/Manila (UTC+08:00) — Local database connection prepared

Found PostgreSQL already installed and running, so no reinstall was needed. Prepared the server's connection settings and added a command to check the project database safely. Added step-by-step local setup instructions and notes for a possible future move to managed hosting; Neon is only an option for later.

The server builds and its tests pass. Its basic health check works, but the project database connection is not working yet: the saved settings point to a different database, and the dedicated project login still needs to be configured privately. Existing passwords and databases were left unchanged. No business features are available yet.

Report: [reports/2026-11-08_05-09-32.md](reports/2026-11-08_05-09-32.md).

## 2026-11-08 04:49:16 Asia/Manila (UTC+08:00) — Project foundation prepared

The four parts of TWENTY9 ELEVEN now open locally: the public website, staff administration, walk-in sales app, and central server. Each has a simple starter page or health check; customers and staff cannot place or manage orders yet.

The foundation builds successfully and its available tests pass. It is prepared to connect to one central database, but a working PostgreSQL setup still needs your own connection details. The server stays available when the database is unavailable.

Setup instructions and a permanent development record were added so future developers can track work accurately. No business workflows, offline sales, or cloud deployment are included. Development tools have moderate dependency advisories to revisit; the production dependency check found none. Startup commands are in the README.

Report: [reports/2026-11-08_04-49-16.md](reports/2026-11-08_04-49-16.md).

## 2026-11-17 22:52:47 Asia/Manila (UTC+08:00) - Setup guide ready; publication awaiting privacy decision

Expanded the README so developers can understand the current starter applications, configure local settings and run each part. The project is not yet on GitHub: the workbook and related notes contain internal business costing, so publication is paused under the requested safety rule. No business features or database changes were made.

Report: [reports/2026-11-17_22-50-09.md](reports/2026-11-17_22-50-09.md).

## 2026-11-20 13:27:37 Asia/Manila (UTC+08:00) — Product catalog database tested

The catalog setup passed testing in a separate database, including automatic SKU assignment and price storage. The working database still needs the catalog tables and a restricted login for the app. Once that setup is approved, development can proceed with protected catalog tools for staff.

Report: [reports/2026-11-20_13-21-51.md](reports/2026-11-20_13-21-51.md).

## 2026-11-20 13:42:29 Asia/Manila (UTC+08:00) — Catalog database checks repeated

The catalog setup passed again in a separate database. The development database connection works. It still needs the catalog migration and a separate restricted app login before staff can save products there.

Report: [reports/2026-11-20_13-40-31.md](reports/2026-11-20_13-40-31.md).

## 2026-11-20 14:22:58 Asia/Manila (UTC+08:00) — Customer order requests

Customers can choose a product, submit an order and use a private code to view it again. The full flow passed in a separate test database. The development database was backed up and is waiting for approval to install the catalog and ordering tables.

Report: [reports/2026-11-20_14-11-21.md](reports/2026-11-20_14-11-21.md).

## 2026-11-20 14:56:51 Asia/Manila (UTC+08:00) — Local ordering is working

The local storefront now shows four sample products. A browser test placed an order, received a reference and opened the saved order again. The order is stored in the local database as Pending Review.

Report: [reports/2026-11-20_14-54-44.md](reports/2026-11-20_14-54-44.md).

## 2026-11-20 15:35:24 Asia/Manila (UTC+08:00) — Admin order review

Staff can open an order, check availability manually and mark it ready for customer confirmation or decline it with a reason. Customers see the updated status through their private lookup. This passed in a separate test database. The development database is backed up and awaits migration approval.

Report: [reports/2026-11-20_15-26-28.md](reports/2026-11-20_15-26-28.md).

## 2026-11-20 15:48:22 Asia/Manila (UTC+08:00) — Local setup guide verified

The README now shows which commands to run in each terminal and how to check the database. All four apps started successfully. The Admin review workflow still needs its migration on the development database.

Report: [reports/2026-11-20_15-44-00.md](reports/2026-11-20_15-44-00.md).

## 2026-11-20 16:06:20 Asia/Manila (UTC+08:00) — Admin review works locally

Staff can now review customer orders in the local Admin dashboard, mark them available or decline them with a reason. Browser tests confirmed that customers see both decisions and the database saves them.

Report: [reports/2026-11-20_16-01-52.md](reports/2026-11-20_16-01-52.md).

## 2026-11-20 16:11:40 Asia/Manila (UTC+08:00) — Admin order review checked again

Both Admin decisions worked again. Customers could see the updated statuses, and the local database saved the orders and the decline reason.

Report: [reports/2026-11-20_16-09-22.md](reports/2026-11-20_16-09-22.md).

## 2026-11-20 16:36:51 Asia/Manila (UTC+08:00) — Customers can confirm available orders

Customers can review the final details and confirm an order once staff mark it available. The order then shows Awaiting Payment in the storefront and Admin. The feature passed in a test database and awaits approval to enable it locally.

Report: [reports/2026-11-20_16-28-44.md](reports/2026-11-20_16-28-44.md).

## 2026-11-20 16:51:12 Asia/Manila (UTC+08:00) — Local customer confirmation is active

A customer can confirm an available order locally. Both the storefront and Admin show Awaiting Payment, and the database keeps the original confirmation time if a duplicate request is sent.

Report: [reports/2026-11-20_16-47-45.md](reports/2026-11-20_16-47-45.md).

## 2026-11-20 17:21:45 Asia/Manila (UTC+08:00) — Order chat and receipt checks

Customers can send messages and receipt screenshots. Staff can reply and record money they verified outside the app. Staff can accept after verifying the minimum deposit and manually checking stock. The workflow passed in a separate test database and awaits local setup approval.

Report: [reports/2026-11-20_17-07-12.md](reports/2026-11-20_17-07-12.md).

## 2026-11-20 17:38:55 Asia/Manila (UTC+08:00) — Order chat and receipt checks work locally

Customers and Admin exchanged messages and tested private receipts on the local database. An order could be accepted only after the deposit was verified and Admin checked stock manually. The database also saved a rejected receipt and its reason.

Report: [reports/2026-11-20_17-35-31.md](reports/2026-11-20_17-35-31.md).

## 2026-11-20 17:57:26 Asia/Manila (UTC+08:00) — Track and complete orders

Staff can start production, mark an order ready and complete it once full payment is verified. Customers can see progress and send the remaining balance receipt before release. The workflow passed in a separate test database and awaits local setup approval.

Report: [reports/2026-11-20_17-46-25.md](reports/2026-11-20_17-46-25.md).

## 2026-11-20 18:39:33 Asia/Manila (UTC+08:00) — Full order workflow works locally

Staff can now move a local order through production and mark it completed once full payment is verified. The customer can see each milestone. Pending or rejected receipts do not clear the balance.

Report: [reports/2026-11-20_18-35-22.md](reports/2026-11-20_18-35-22.md).

## 2026-11-20 18:50:20 Asia/Manila (UTC+08:00) — Customer order notifications

Customers can see order updates and mark them as read in their private lookup. Staff reply notices point to chat. The feature passed in a separate test database and awaits local setup approval.

Report: [reports/2026-11-20_18-44-23.md](reports/2026-11-20_18-44-23.md).

## 2026-11-20 19:16:10 Asia/Manila (UTC+08:00) — Customer notifications work locally

Customers can view order notices, refresh for updates and mark them as read. Local browser tests confirmed the notices appeared throughout the workflow and the read state stayed saved.

Report: [reports/2026-11-20_19-12-07.md](reports/2026-11-20_19-12-07.md).

## 2026-11-20 19:37:11 Asia/Manila (UTC+08:00) — Staff sign-in and action history

Staff can use individual accounts. Owners can manage staff and view who reviewed orders, verified receipts and released work. Production staff only see their assigned orders. The feature was tested in a separate database.

Report: [reports/2026-11-20_19-21-38.md](reports/2026-11-20_19-21-38.md).

## 2026-11-20 19:56:45 Asia/Manila (UTC+08:00) — Start all four apps with one command

Run npm run dev once PostgreSQL is running. The launcher checks the ports, starts all apps and tells you when they respond. Ctrl+C stops the apps together. A port conflict leaves the other program running.

Report: [reports/2026-11-20_19-43-17.md](reports/2026-11-20_19-43-17.md).

## 2026-11-20 20:37:21 Asia/Manila (UTC+08:00) - Staff accounts are active locally

Staff can now sign in individually. The owner can manage staff and review customer orders. Production Staff can work on assigned orders, and Cashiers are restricted to their role. Testing confirmed customer ordering still works and important actions show who performed them.

Report [reports/2026-11-20_20-29-46.md](reports/2026-11-20_20-29-46.md).

## 2026-11-20 21:11:26 Asia/Manila (UTC+08:00) - A new look for the customer website

The website now has a coordinated print studio design, product cards, category browsing and clearer order forms. Customers can still place requests and privately track and discuss their orders. The real cart will be developed separately.

Report [reports/2026-11-20_21-05-00.md](reports/2026-11-20_21-05-00.md).

## 2026-11-20 21:36:10 Asia/Manila (UTC+08:00) - Shop for several prints in one request

Customers can now add several products to a cart, adjust quantities, keep selections after refreshing and submit one request through checkout. Staff and customers see the complete order. Payment still follows review and customer confirmation. The normal project build now works after correcting Windows attributes on generated files.

Report [reports/2026-11-20_21-25-15.md](reports/2026-11-20_21-25-15.md).

## 2026-11-20 22:11:01 Asia/Manila (UTC+08:00) - Product management is prepared

Owners can manage products, categories, prices, minimum quantities, attributes and images through the new Admin catalog page. The website can display uploaded images. Testing passed using a separate database. The regular local database needs approval for the new setup step before the page can be used there.

Report [reports/2026-11-20_21-51-00.md](reports/2026-11-20_21-51-00.md).

## 2026-11-20 22:55:02 Asia/Manila (UTC+08:00) - Product management works on the local database

The owner can now manage products, categories, images, prices and availability in Admin. Published products and images appear on the website. A real two-product demo request was saved and reviewed, and changing the catalog price preserved the saved order price. A labeled demo product remains available for the team to try.

Report [reports/2026-11-20_22-48-11.md](reports/2026-11-20_22-48-11.md).

## 2026-11-20 23:47:25 Asia/Manila (UTC+08:00) - Product management checked again

The catalog was already active. Checked the additional search, category filter, product details, attributes, cart quantities, visibility controls and archive action. The website, Admin review and saved order prices worked correctly. Existing payment records stayed intact, and all builds and tests passed.

Report [reports/2026-11-20_23-40-42.md](reports/2026-11-20_23-40-42.md).

## 2026-11-21 00:11:55 Asia/Manila (UTC+08:00) - Cashier walk-in ordering is prepared

Cashiers can sign in, find real products, build an order and enter customer details through the new POS interface. Tests on a separate database confirmed that requests reach Admin review and identify the creating staff member. Payment and stock checks still apply. The regular database needs approval for the new setup step before walk-in submissions can be used locally.

Report [reports/2026-11-20_23-52-04.md](reports/2026-11-20_23-52-04.md).

## 2026-11-21 00:22:32 Asia/Manila (UTC+08:00) - Walk-in orders work locally

Cashiers can now use the local POS to build and submit a walk-in request. Admin sees the saved order and who created it. Online ordering still works, and previous orders and payments stayed intact. The local-cashier account is ready, with secure password-copying instructions in README. Builds and tests passed.

Report [reports/2026-11-21_00-16-23.md](reports/2026-11-21_00-16-23.md).
