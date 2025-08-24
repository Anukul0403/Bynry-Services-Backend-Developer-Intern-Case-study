If company has no warehouses then returns empty alerts

If no recent sales then no alerts

Division by zero in average sales, use fallback value to avoid errors

If missing supplier info then alert includes supplier: null safely

If missing inventory for some products then those products excluded from alerts
