/**
 * Database adapter for Supabase using JS client (HTTPS REST API)
 * Provides Sequelize-like interface for compatibility
 */

const { getSupabaseClient } = require('./supabase');

/**
 * Supabase Database Adapter
 * Mimics Sequelize interface but uses Supabase REST API
 */
class SupabaseAdapter {
  constructor() {
    this.client = getSupabaseClient();
  }

  /**
   * Authenticate connection
   */
  async authenticate() {
    try {
      // Test connection by querying a system table
      const { data, error } = await this.client
        .from('products')
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (expected on first run)
        throw error;
      }
      
      return true;
    } catch (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  }

  /**
   * Sync database (create tables if they don't exist)
   * Note: Supabase requires tables to be created via SQL or dashboard
   */
  async sync(options = {}) {
    console.log('🔄 Supabase sync: Tables should be created via Supabase dashboard or SQL migrations');
    console.log('💡 Supabase uses PostgreSQL - tables are managed via SQL or dashboard');
    return true;
  }
}

/**
 * Product Model Adapter for Supabase
 */
class ProductModel {
  constructor(client) {
    this.client = client;
    this.tableName = 'products';
  }

  /**
   * Find all products with filters
   */
  async findAll(options = {}) {
    // Handle attributes selection
    let selectFields = '*';
    if (options.attributes) {
      if (Array.isArray(options.attributes)) {
        selectFields = options.attributes.join(',');
      } else if (options.attributes.exclude) {
        selectFields = '*';
      }
    }

    let query = this.client.from(this.tableName).select(selectFields);

    // Apply where conditions
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        
        // Handle Sequelize operators (like, gte, lte, etc.)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Check if it's a Sequelize operator object
          const opKeys = Object.keys(value);
          if (opKeys.length > 0) {
            // Try to get Sequelize Op if available
            let SequelizeOp = null;
            try {
              SequelizeOp = require('sequelize').Op;
            } catch (e) {
              // Sequelize not available, check for common operator patterns
            }
            
            if (SequelizeOp && value[SequelizeOp]) {
              const op = Object.keys(value[SequelizeOp])[0];
              const opValue = value[SequelizeOp][op];
              
              if (op === 'like' || op === 'iLike') {
                query = query.ilike(key, `%${opValue}%`);
              } else if (op === 'gte') {
                query = query.gte(key, opValue);
              } else if (op === 'lte') {
                query = query.lte(key, opValue);
              } else if (op === 'gt') {
                query = query.gt(key, opValue);
              } else if (op === 'lt') {
                query = query.lt(key, opValue);
              }
            } else {
              // Fallback: treat as direct value
              query = query.eq(key, value);
            }
          } else {
            query = query.eq(key, value);
          }
        } else {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options.order) {
      options.order.forEach(([column, direction]) => {
        query = query.order(column, { ascending: direction === 'ASC' });
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Apply offset
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    let results = data || [];

    // Handle attributes exclude
    if (options.attributes && options.attributes.exclude) {
      results = results.map(item => {
        const filtered = { ...item };
        options.attributes.exclude.forEach(field => {
          delete filtered[field];
        });
        return filtered;
      });
    }

    // Handle raw option (for backup system)
    if (options.raw) {
      return results;
    }

    // Return in Sequelize format
    return {
      rows: results,
      count: results.length || 0
    };
  }

  /**
   * Find and count all (for pagination)
   */
  async findAndCountAll(options = {}) {
    try {
      // Get count
      let countQuery = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
      
      if (options.where) {
        Object.keys(options.where).forEach(key => {
          const value = options.where[key];
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            // Handle boolean values and simple equality
            countQuery = countQuery.eq(key, value);
          } else {
            // For complex operators, just apply simple equality for count
            const opKeys = Object.keys(value);
            if (opKeys.length === 0 || !value[require('sequelize')?.Op]) {
              countQuery = countQuery.eq(key, value);
            }
          }
        });
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error('❌ Supabase count query error:', countError);
        console.error('❌ Count error message:', countError.message);
        console.error('❌ Count error code:', countError.code);
        console.error('❌ Count error details:', countError.details);
        throw countError;
      }

      // Get data
      const result = await this.findAll(options);
      
      // Ensure result has rows property
      const rows = result.rows || (Array.isArray(result) ? result : []);

      return {
        rows: rows,
        count: count || 0
      };
    } catch (error) {
      console.error('❌ findAndCountAll error:', error);
      console.error('❌ Error in table:', this.tableName);
      console.error('❌ Error with options:', JSON.stringify(options, null, 2));
      throw error;
    }
  }

  /**
   * Find one product by ID
   */
  async findByPk(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Create a new product
   */
  async create(productData) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk create products (for restore)
   */
  async bulkCreate(products, options = {}) {
    if (!products || products.length === 0) {
      return [];
    }

    // Insert all products at once
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(products)
      .select();

    if (error) {
      // If bulk insert fails, try one by one (for ignoreDuplicates)
      if (options.ignoreDuplicates) {
        const results = [];
        for (const product of products) {
          try {
            const result = await this.create(product);
            results.push(result);
          } catch (err) {
            // Ignore duplicate errors
            if (!err.message.includes('duplicate') && !err.code?.includes('23505')) {
              throw err;
            }
          }
        }
        return results;
      }
      throw error;
    }

    return data || [];
  }

  /**
   * Update a product
   */
  async update(productData, options) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(productData)
      .eq('id', options.where.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a product
   */
  async destroy(options) {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', options.where.id);

    if (error) throw error;
    return true;
  }

  /**
   * Count products
   */
  async count(options = {}) {
    let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value !== 'object' || !value[require('sequelize').Op]) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
}

/**
 * User Model Adapter for Supabase
 */
class UserModel {
  constructor(client) {
    this.client = client;
    this.tableName = 'users';
  }

  async findAll(options = {}) {
    // Handle attributes selection
    let selectFields = '*';
    if (options.attributes) {
      if (Array.isArray(options.attributes)) {
        selectFields = options.attributes.join(',');
      } else if (options.attributes.exclude) {
        selectFields = '*';
      }
    }

    let query = this.client.from(this.tableName).select(selectFields);

    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle Sequelize operators
          const opKeys = Object.keys(value);
          if (opKeys.length > 0) {
            let SequelizeOp = null;
            try {
              SequelizeOp = require('sequelize').Op;
            } catch (e) {}
            
            if (SequelizeOp && value[SequelizeOp]) {
              const op = Object.keys(value[SequelizeOp])[0];
              const opValue = value[SequelizeOp][op];
              
              if (op === 'like' || op === 'iLike') {
                query = query.ilike(key, `%${opValue}%`);
              } else if (op === 'gte') {
                query = query.gte(key, opValue);
              } else if (op === 'lte') {
                query = query.lte(key, opValue);
              }
            } else {
              query = query.eq(key, value);
            }
          } else {
            query = query.eq(key, value);
          }
        } else {
          query = query.eq(key, value);
        }
      });
    }

    if (options.order) {
      options.order.forEach(([column, direction]) => {
        query = query.order(column, { ascending: direction === 'ASC' });
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];

    // Handle attributes exclude
    if (options.attributes && options.attributes.exclude) {
      results = results.map(item => {
        const filtered = { ...item };
        options.attributes.exclude.forEach(field => {
          delete filtered[field];
        });
        return filtered;
      });
    }

    // Handle raw option (for backup system)
    if (options.raw) {
      return results;
    }

    return results;
  }

  /**
   * Find and count all (for pagination)
   */
  async findAndCountAll(options = {}) {
    // Get count
    let countQuery = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
    
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          countQuery = countQuery.eq(key, value);
        } else {
          // Handle Sequelize operators for count
          const opKeys = Object.keys(value);
          if (opKeys.length === 0 || !value[require('sequelize')?.Op]) {
            countQuery = countQuery.eq(key, value);
          }
        }
      });
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Get data
    const rows = await this.findAll(options);

    return {
      rows,
      count: count || 0
    };
  }

  async findByPk(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findOne(options) {
    let query = this.client.from(this.tableName).select('*').limit(1);

    if (options.where) {
      Object.keys(options.where).forEach(key => {
        query = query.eq(key, options.where[key]);
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data?.[0] || null;
  }

  async create(userData) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk create users (for restore)
   */
  async bulkCreate(users, options = {}) {
    if (!users || users.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(users)
      .select();

    if (error) {
      if (options.ignoreDuplicates) {
        const results = [];
        for (const user of users) {
          try {
            const result = await this.create(user);
            results.push(result);
          } catch (err) {
            if (!err.message.includes('duplicate') && !err.code?.includes('23505')) {
              throw err;
            }
          }
        }
        return results;
      }
      throw error;
    }

    return data || [];
  }

  async update(userData, options) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(userData)
      .eq('id', options.where.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async count(options = {}) {
    let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        query = query.eq(key, options.where[key]);
      });
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
}

/**
 * Order Model Adapter for Supabase
 */
class OrderModel {
  constructor(client) {
    this.client = client;
    this.tableName = 'orders';
  }

  async findAll(options = {}) {
    // Handle attributes selection
    let selectFields = '*';
    if (options.attributes) {
      if (Array.isArray(options.attributes)) {
        selectFields = options.attributes.join(',');
      } else if (options.attributes.exclude) {
        selectFields = '*';
      }
    }

    let query = this.client.from(this.tableName).select(selectFields);

    // Handle include (joins)
    const needsJoin = options.include && options.include.length > 0;

    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle Sequelize operators
          const opKeys = Object.keys(value);
          if (opKeys.length > 0) {
            let SequelizeOp = null;
            try {
              SequelizeOp = require('sequelize').Op;
            } catch (e) {}
            
            if (SequelizeOp && value[SequelizeOp]) {
              const op = Object.keys(value[SequelizeOp])[0];
              const opValue = value[SequelizeOp][op];
              
              if (op === 'like' || op === 'iLike') {
                query = query.ilike(key, `%${opValue}%`);
              } else if (op === 'gte') {
                query = query.gte(key, opValue);
              } else if (op === 'lte') {
                query = query.lte(key, opValue);
              }
            } else {
              query = query.eq(key, value);
            }
          } else {
            query = query.eq(key, value);
          }
        } else {
          query = query.eq(key, value);
        }
      });
    }

    if (options.order) {
      options.order.forEach(([column, direction]) => {
        query = query.order(column, { ascending: direction === 'ASC' });
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];

    // Handle attributes exclude
    if (options.attributes && options.attributes.exclude) {
      results = results.map(item => {
        const filtered = { ...item };
        options.attributes.exclude.forEach(field => {
          delete filtered[field];
        });
        return filtered;
      });
    }

    // Handle include (joins) - fetch related data separately
    if (needsJoin && results.length > 0) {
      for (const include of options.include) {
        if (include.model && include.as) {
          // Get the actual model instance (could be UserModel, ProductModel, etc.)
          const relatedModel = include.model;
          const foreignKey = include.foreignKey || (include.as === 'user' ? 'userId' : `${include.as}Id`);
          
          // Extract related IDs from results
          const relatedIds = results
            .map(r => r[foreignKey] || (include.as === 'user' ? r.userId : null))
            .filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates
          
          if (relatedIds.length > 0) {
            try {
              // Fetch related records - handle both Sequelize models and Supabase adapter models
              let relatedData = [];
              if (typeof relatedModel.findAll === 'function') {
                // Use Supabase .in() for efficient array queries
                try {
                  // Build query with .in() for array of IDs
                  let relatedQuery = relatedModel.client.from(relatedModel.tableName).select('*');
                  
                  // Use .in() for array filtering
                  if (relatedIds.length > 0) {
                    relatedQuery = relatedQuery.in('id', relatedIds);
                  }
                  
                  // Apply attributes filter if specified
                  if (include.attributes && Array.isArray(include.attributes)) {
                    relatedQuery = relatedQuery.select(include.attributes.join(','));
                  }
                  
                  const { data: relatedRows, error: relatedError } = await relatedQuery;
                  
                  if (relatedError) {
                    console.warn(`⚠️ Error fetching related ${include.as}:`, relatedError.message);
                    relatedData = [];
                  } else {
                    relatedData = relatedRows || [];
                  }
                } catch (queryError) {
                  console.warn(`⚠️ Error in related query for ${include.as}:`, queryError.message);
                  relatedData = [];
                }
              } else {
                // If it's a Sequelize model, we need to use it differently
                // For now, skip the join if model doesn't have findAll
                continue;
              }
              
              // Create a map for quick lookup
              const relatedMap = {};
              (Array.isArray(relatedData) ? relatedData : relatedData.rows || []).forEach(item => {
                if (item && item.id) {
                  relatedMap[item.id] = item;
                }
              });
              
              // Attach related data to results
              results = results.map(result => {
                const relatedId = result[foreignKey] || (include.as === 'user' ? result.userId : null);
                const relatedItem = relatedId ? relatedMap[relatedId] : null;
                
                // Filter attributes if specified
                if (relatedItem && include.attributes && Array.isArray(include.attributes)) {
                  const filtered = {};
                  include.attributes.forEach(attr => {
                    if (relatedItem[attr] !== undefined) {
                      filtered[attr] = relatedItem[attr];
                    }
                  });
                  return {
                    ...result,
                    [include.as]: filtered
                  };
                }
                
                return {
                  ...result,
                  [include.as]: relatedItem || null
                };
              });
            } catch (joinError) {
              console.warn(`⚠️ Failed to join ${include.as}:`, joinError.message);
              // Continue without the join rather than failing
            }
          }
        }
      }
    }

    // Handle raw option (for backup system)
    if (options.raw) {
      return results;
    }

    return results;
  }

  async create(orderData) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(orderData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk create orders (for restore)
   */
  async bulkCreate(orders, options = {}) {
    if (!orders || orders.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(orders)
      .select();

    if (error) {
      if (options.ignoreDuplicates) {
        const results = [];
        for (const order of orders) {
          try {
            const result = await this.create(order);
            results.push(result);
          } catch (err) {
            if (!err.message.includes('duplicate') && !err.code?.includes('23505')) {
              throw err;
            }
          }
        }
        return results;
      }
      throw error;
    }

    return data || [];
  }

  async count(options = {}) {
    let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        query = query.eq(key, options.where[key]);
      });
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  /**
   * Find and count all (for pagination)
   */
  async findAndCountAll(options = {}) {
    // Get count
    let countQuery = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
    
    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          countQuery = countQuery.eq(key, value);
        }
      });
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Get data
    const rows = await this.findAll(options);

    return {
      rows,
      count: count || 0
    };
  }

  /**
   * Sum a column (for revenue calculations)
   */
  async sum(column, options = {}) {
    // Select all columns to get the data, then sum in JavaScript
    // Supabase doesn't have a direct SUM() function via JS client
    let query = this.client.from(this.tableName).select('*');

    if (options.where) {
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle Sequelize operators
          const opKeys = Object.keys(value);
          if (opKeys.length > 0) {
            let SequelizeOp = null;
            try {
              SequelizeOp = require('sequelize').Op;
            } catch (e) {}
            
            if (SequelizeOp && value[SequelizeOp]) {
              const op = Object.keys(value[SequelizeOp])[0];
              const opValue = value[SequelizeOp][op];
              
              if (op === 'like' || op === 'iLike') {
                query = query.ilike(key, `%${opValue}%`);
              } else if (op === 'eq') {
                query = query.eq(key, opValue);
              }
            } else {
              query = query.eq(key, value);
            }
          } else {
            query = query.eq(key, value);
          }
        } else {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;
    if (error) {
      console.error(`❌ Error in sum query for column ${column}:`, error);
      throw error;
    }

    // Calculate sum in JavaScript (Supabase doesn't have direct sum)
    const sum = (data || []).reduce((acc, row) => {
      // Handle both camelCase and snake_case column names
      const value = parseFloat(row[column] || row[column.toLowerCase()] || 0) || 0;
      return acc + value;
    }, 0);

    return sum;
  }
}

module.exports = {
  SupabaseAdapter,
  ProductModel,
  UserModel,
  OrderModel
};

