# MySQL MCP Integration Examples

This document provides examples of how to integrate the MySQL MCP server with various AI assistants and use it effectively.

## Configuration Example

Below is an example of a correct MCP configuration:

```json
"mysql": {
  "command": "npx",
  "args": ["mysql-query-mcp-server@latest"],
  "env": {
    "LOCAL_DB_HOST": "localhost",
    "LOCAL_DB_USER": "root",
    "LOCAL_DB_PASS": "<YOUR_LOCAL_DB_PASSWORD>",
    "LOCAL_DB_NAME": "your_database",
    "LOCAL_DB_PORT": "3306",
    
    "DEVELOPMENT_DB_HOST": "dev.example.com",
    "DEVELOPMENT_DB_USER": "<DEV_DB_USER>",
    "DEVELOPMENT_DB_PASS": "<DEV_DB_PASSWORD>",
    "DEVELOPMENT_DB_NAME": "your_database",
    "DEVELOPMENT_DB_PORT": "3306",
    
    "STAGING_DB_HOST": "staging.example.com",
    "STAGING_DB_USER": "<STAGING_DB_USER>",
    "STAGING_DB_PASS": "<STAGING_DB_PASSWORD>",
    "STAGING_DB_NAME": "your_database",
    "STAGING_DB_PORT": "3306",
    
    "PRODUCTION_DB_HOST": "prod.example.com",
    "PRODUCTION_DB_USER": "<PROD_DB_USER>",
    "PRODUCTION_DB_PASS": "<PROD_DB_PASSWORD>",
    "PRODUCTION_DB_NAME": "your_database",
    "PRODUCTION_DB_PORT": "3306",
    
    "DEBUG": "true",
    "MCP_MYSQL_SSL": "true",
    "MCP_MYSQL_REJECT_UNAUTHORIZED": "false"
  }
}
```

**Important Notes**:
- Use `LOCAL_`, `DEVELOPMENT_`, `STAGING_`, and `PRODUCTION_` prefixes for environments
- Do not use abbreviated versions like `DEV_` or `PROD_`
- Set `MCP_MYSQL_SSL` to `true` for secure connections
- Use `MCP_MYSQL_REJECT_UNAUTHORIZED` for self-signed certificates

## AI Tool Integration

### Setup

1. Start the MySQL MCP server:
```bash
mysql-query-mcp-server
```

2. Configure your AI tool to use the MySQL MCP server (specific steps depend on your AI tool)

### Usage Examples

#### Basic Query Example
```
I need to get a list of users from my database. Can you help?
```

Your AI assistant might respond:
```
I can help you query your database. Let me execute a SELECT query to get the users.

SELECT * FROM users LIMIT 10;

This will return the first 10 users from your database. Which environment would you like to query? (local, development, staging, production)
```

You can then specify:
```
Use the local environment.
```

#### Complex Query Example
```
Can you show me the top 5 products by sales in the last month?
```

Your AI assistant might respond:
```
I'll help you get that information. Let me query your database:

SELECT 
  p.product_name,
  SUM(o.quantity * p.price) as total_sales
FROM 
  orders o
JOIN 
  products p ON o.product_id = p.id
WHERE 
  o.order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
GROUP BY 
  p.product_name
ORDER BY 
  total_sales DESC
LIMIT 5;

Which environment would you like me to run this on?
```

### Querying Database Structure
```
Can you show me the structure of the customers table?
```

Your AI assistant might respond:
```
I'll help you examine the structure of the customers table. Let me run:

DESCRIBE customers;

This will show the columns and their data types. Which environment should I use?
```

### Data Analysis Example
```
Analyze the age distribution of our users.
```

Your AI assistant might respond:
```
Let me get that data for you. I'll run:

SELECT 
  CASE 
    WHEN age < 18 THEN 'Under 18'
    WHEN age BETWEEN 18 AND 24 THEN '18-24'
    WHEN age BETWEEN 25 AND 34 THEN '25-34'
    WHEN age BETWEEN 35 AND 44 THEN '35-44'
    WHEN age BETWEEN 45 AND 54 THEN '45-54'
    WHEN age BETWEEN 55 AND 64 THEN '55-64'
    ELSE '65+' 
  END as age_group,
  COUNT(*) as count
FROM 
  users
GROUP BY 
  age_group
ORDER BY 
  FIELD(age_group, 'Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+');

Which environment would you like to use?
```

### General Information Retrieval
```
What databases do we have available in the development environment?
```

Your AI assistant might respond:
```
Let me check what databases are available in the development environment. I'll use the MySQL MCP tools to get this information.

Would you like me to run this query on the development environment?
```

After confirmation, the AI assistant will list all available databases.

### Debugging Database Connections
```
I'm having trouble connecting to the database. Can you help diagnose?
```

Your AI assistant might respond:
```
I can help diagnose database connection issues. Let me check the database status:

SHOW STATUS LIKE 'Conn%';

Which environment are you having trouble with?
```

## Using the Three Main Tools

The MySQL MCP server provides three main tools that your AI assistant can use:

### 1. query

Execute read-only SQL queries against a specific environment:

```
Use the query tool to run:
SELECT * FROM customers WHERE signup_date > '2023-01-01' LIMIT 10;
on the development environment
```

### 2. info

Get detailed information about your database:

```
Use the info tool to check the status of our production database.
```

### 3. environments

List all configured database environments:

```
Please use the environments tool to show me all available database environments.
```

## Tips for Effective Integration

1. **Be specific about environments**: Always specify which environment you want to query.

2. **Start small**: Begin with simple queries before moving to complex ones.

3. **Security first**: Avoid running queries on production environments unless necessary.

4. **Use troubleshooting commands**: If you're having issues, try commands like:
   ```sql
   SHOW VARIABLES;
   SHOW PROCESSLIST;
   SHOW ENGINE INNODB STATUS;
   ```

5. **Remember read-only limitations**: The MCP server only allows SELECT, SHOW, and DESCRIBE queries.

6. **Check your connection**: If your AI assistant says it can't connect, make sure your MySQL MCP server is running.

7. **Include timeouts for complex queries**: For queries that might take longer:
   ```
   Run this query on development with a 60-second timeout:
   
   SELECT * FROM large_table WHERE complex_condition;
   ``` 