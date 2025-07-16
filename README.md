# Sale Room Backend


A comprehensive e-commerce backend API built with Node.js, Express, and MySQL. This application provides a complete solution for managing online sales, auctions, and user transactions.



## 🚀 Features

### Core Functionality
- **User Management**: Complete user registration, authentication, and profile management
- **Product Management**: Create, update, and manage products with auction capabilities
- **Shopping Cart System**: Add/remove items, manage quantities, and cart persistence
- **Order Management**: Complete order processing with delivery tracking
- **Payment Processing**: Secure payment handling and transaction management
- **Role-Based Access Control**: User rights and permissions system
- **File Upload**: Product image and user photo management

### API Endpoints
- `/api/users/` - User registration, login, profile management
- `/api/products/` - Product CRUD operations, auction management
- `/api/carts/` - Shopping cart operations
- `/api/orders/` - Order creation and management
- `/api/payments/` - Payment processing
- `/api/rights/` - User rights and permissions

## 🗄️ Database Structure

<div align="center">
  <img src="database diagram.jpg" alt="Sale Room Backend Database Diagram" width="600" height="400" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
</div>

### Core Tables

**Users Table**
- User authentication and profile information
- Fields: id, name, email, password, phone, last_login, photo, timestamps


**Products Table**
- Product catalog with auction functionality
- Fields: id, name, initial_price, current_price, description, user_id, status, current_user_id, photo, start_date, end_date, timestamps
- Status options: active, inactive, paid

**Orders Table**
- Order management with delivery information
- Fields: id, user_id, shipping address (country, city, street, etc.), total, is_paid, is_delivered, timestamps

**Shopping Carts Table**
- User shopping cart management
- Fields: id, user_id, timestamps

**Payments Table**
- Payment transaction tracking
- Fields: id, order_id, amount, payment_method, status, timestamps

**Rights Table**
- Role-based access control
- Fields: id, name, description, timestamps

### Junction Tables

**Cart Items Table**
- Links products to shopping carts with quantities
- Fields: id, cart_id, product_id, quantity, timestamps

**Order Items Table**
- Links products to orders with purchase details
- Fields: id, order_id, product_id, quantity, price, timestamps

**User Rights Table**
- Many-to-many relationship between users and rights
- Fields: id, user_id, right_id, timestamps

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with Knex.js ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt for password hashing
- **File Upload**: Multer for handling file uploads
- **CORS**: Cross-origin resource sharing enabled

## 📋 Database Commands

CREATE TABLE:
npx knex migrate:make alter_file_name_table --knexfile knexfile.cjs
RUN MIGRATIONS:
npx knex migrate:latest --knexfile knexfile.cjs
ROLLBACK:
npx knex migrate:rollback --knexfile knexfile.cjs
ALTER:
npx knex migrate:make rename_file_name --knexfile knexfile.cjs
create seed:
npx knex seed:make file_name_seed
run seed:
npx knex seed:run --knexfile knexfile.cjs
specific seed
npx knex seed:run --specific=file_name_seed.cjs --knexfile knexfile.cjs