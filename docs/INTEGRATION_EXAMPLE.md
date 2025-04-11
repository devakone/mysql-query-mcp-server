# MySQL MCP Integration Examples

This document provides examples of how to integrate the MySQL MCP server with various AI assistants and use it effectively.

## Cursor IDE Example

### Setup

1. Start the MySQL MCP server:
```bash
cursor-mysql-mcp
```

2. Configure Cursor IDE to use the MySQL MCP server:
   - In Cursor, go to Settings → Extensions → Model Context Protocol
   - Add a new MCP connection with:
     - Name: MySQL
     - URL: http://localhost:3340
     - Save the connection

### Usage Examples

#### Basic Query Example
```
@Claude I need to get a list of users from my database. Can you help?
```

Claude might respond:
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
@Claude Can you show me the top 5 products by sales in the last month?
```

Claude might respond:
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

## Windsurf Integration

### Querying Database Structure
```
@Claude, can you show me the structure of the customers table?
```

Claude might respond:
```
I'll help you examine the structure of the customers table. Let me run:

DESCRIBE customers;

This will show the columns and their data types. Which environment should I use?
```

### Data Analysis Example
```
@Claude, analyze the age distribution of our users.
```

Claude might respond:
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

## Claude Desktop Integration

### General Information Retrieval
```
@Claude What databases do we have available in the development environment?
```

Claude might respond:
```
Let me check what databases are available in the development environment. I'll use the MySQL MCP tools to get this information.

Would you like me to run this query on the development environment?
```

After confirmation, Claude will list all available databases.

### Debugging Database Connections
```
@Claude I'm having trouble connecting to the database. Can you help diagnose?
```

Claude might respond:
```
I can help diagnose database connection issues. Let me check the database status:

SHOW STATUS LIKE 'Conn%';

Which environment are you having trouble with?
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

6. **Check your connection**: If Claude says it can't connect, make sure your MySQL MCP server is running.

7. **Include timeouts for complex queries**: For queries that might take longer:
   ```
   @Claude Run this query on development with a 60-second timeout:
   
   SELECT * FROM large_table WHERE complex_condition;
   ``` 