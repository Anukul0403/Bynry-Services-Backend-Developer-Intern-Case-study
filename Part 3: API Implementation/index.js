const express = require('express');
const { Op } = require('sequelize');
const app = express();

const { Warehouse, Product, Inventory, Sale, Supplier, ProductSupplier } = require('./models');

app.get('/api/companies/:companyId/alerts/low-stock', async (req, res) => {
  const companyId = parseInt(req.params.companyId, 10);

  try {
    //get all warehouse of the given company
    const warehouses = await Warehouse.findAll({ where: { company_id: companyId } });
    const warehouseIds = warehouses.map(w => w.id);

    //find date which was 30 dasy ago 
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    //find all products with sales in last 30 days in all warehouses
    const sales = await Sale.findAll({
      where: {
        warehouse_id: { [Op.in]: warehouseIds },
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: ['product_id'],
      group: ['product_id']
    });
    const productIds = sales.map(s => s.product_id);

    //if no products with recent sales return empty alert
    if (productIds.length === 0) {
      return res.json({ alerts: [], total_alerts: 0 });
    }

    // get inventory records for these products 
    const inventories = await Inventory.findAll({
      where: {
        warehouse_id: { [Op.in]: warehouseIds },
        product_id: { [Op.in]: productIds }
      },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'threshold'] },
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name'] }
      ]
    });

    const alerts = [];

    // for each inventory record checkng if stock is below product level
    for (const inv of inventories) {
      if (inv.quantity < inv.product.threshold) {
        // get the first supplier for the product if any
        const prodSupplier = await ProductSupplier.findOne({
          where: { product_id: inv.product.id },
          include: [{ model: Supplier, as: 'supplier' }]
        });

        // calculate avg dialy sales of last 30 day 
        const recentSales = await Sale.findAll({
          where: {
            product_id: inv.product.id,
            warehouse_id: inv.warehouse.id,
            created_at: { [Op.gte]: thirtyDaysAgo }
          }
        });
        const totalSold = recentSales.reduce((acc, sale) => acc + sale.quantity, 0);
        const avgDailySales = totalSold / 30 || 0.1; // avoid division by zero
        const daysUntilStockout = Math.floor(inv.quantity / avgDailySales);

        // creating alerts with all info
        alerts.push({
          product_id: inv.product.id,
          product_name: inv.product.name,
          sku: inv.product.sku,
          warehouse_id: inv.warehouse.id,
          warehouse_name: inv.warehouse.name,
          current_stock: inv.quantity,
          threshold: inv.product.threshold,
          days_until_stockout,
          supplier: prodSupplier && prodSupplier.supplier
            ? {
                id: prodSupplier.supplier.id,
                name: prodSupplier.supplier.name,
                contact_email: prodSupplier.supplier.contact_email
              }
            : null
        });
      }
    }

    // sending alert and count as response
    res.json({
      alerts: alerts,
      total_alerts: alerts.length
    });

  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
