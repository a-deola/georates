# 🌍 GeoRates API

GeoRates is a RESTful API built with **NestJS** that fetches and stores country and currency data from external APIs. It supports CRUD operations, periodic refresh of data, and provides insights like estimated GDP and exchange rates.

---

## 🚀 Features

- Fetch and persist country data with exchange rates  
- Filter and sort countries by region, currency, or GDP  
- Retrieve country data, including flag, population, and GDP  
- Generate summary image after each refresh  
---

## 🧩 Stack

- **Backend:** NestJS  
- **Database:** MySQL (TypeORM)  
- **External APIs:**
  - [REST Countries API](https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies)
  - [Exchange Rate API](https://api.exchangerate-api.com/v4/latest/USD)

---

## ⚙️ Setup

### 1. Clone the repository
```bash
git clone https://github.com/a-deola/georates.git
cd georates
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a .env file in the project root:

```bash
PORT=3000
REFRESH_TIMEOUT_MS=20000
CACHE_IMAGE_PATH=./cache/summary.png
DATABASE_URL=mysql://user:password@host:port/database
```

### 4. Run the application
```bash
npm run start:dev
```

Server runs on:
👉 http://localhost:3000

### 🧭 API Endpoints

### Countries
| Method | Endpoint | Description |
|-----------|-----------|-----------|
| POST     | /refresh    | Fetch and update all countries (refresh data)   |
| GET    | /countries   | Get all countries, supports filters (sample: region=Africa, currency=NGN, sort=gdp_desc, etc)    |
| GET    | /countries/:name   | Get details of a specific country   |
| GET    | /countries/image   | Get summary image of the countries with top 5 GDP    |
| GET    | /status   | Get summary of data available    |
| DELETE    | /countries/:name     | Delete country data from database    |


		
		
		

