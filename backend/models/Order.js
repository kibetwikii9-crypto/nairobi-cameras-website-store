const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: false
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'mpesa', 'card', 'bank_transfer'),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    orderStatus: {
      type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
      defaultValue: 'pending'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    hooks: {
      beforeCreate: (order) => {
        if (!order.orderNumber) {
          const timestamp = Date.now().toString();
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          order.orderNumber = `GST-${timestamp.slice(-6)}-${random}`;
        }
      }
    }
  });

  return Order;
};