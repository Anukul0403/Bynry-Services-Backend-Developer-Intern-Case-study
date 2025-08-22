Here are a the changes I made for the API to work:

Normalized name and SKU using strip() and upper()

Validated price, warehose_id, and initial_quantity with python checks

Made sure that the warehouse exists

Made sure SKU is unique 

Used db.session.flush() and commit() for Product and Inventory creation

Made sure exception handling is managed and also right status code is sent

code:

    from flask import request, jsonify
    from sqlalchemy.exc import IntegrityError
    import logging
    
    @app.route('/api/products', methods=['POST'])
    def create_product():
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "JSON body required"}), 400
            
        name = data.get('name', '').strip()
        sku = data.get('sku', '').strip().upper()
        price = data.get('price')
        warehouse_id = data.get('warehouse_id')
        initial_quantity = data.get('initial_quantity')
    
        if not name:
            return jsonify({"error": "Name is required"}), 400
        if not sku:
            return jsonify({"error": "SKU is required"}), 400
    
        try:
            price = float(price)
            if price < 0:
                raise ValueError()
        except Exception:
            return jsonify({"error": "Price must be a non-negative number"}), 400
    
        if not isinstance(warehouse_id, int) or warehouse_id <= 0:
            return jsonify({"error": "warehouse_id must be a positive integer"}), 400
        if not isinstance(initial_quantity, int) or initial_quantity < 0:
            return jsonify({"error": "initial_quantity must be a non-negative integer"}), 400
    
        warehouse = Warehouse.query.get(warehouse_id)
        if not warehouse:
            return jsonify({"error": "Warehouse not found"}), 404
    
        if Product.query.filter_by(sku=sku).first():
            return jsonify({"error": "SKU already exists"}), 400
    
        try:
            product = Product(name=name, sku=sku, price=price, warehouse_id=warehouse_id)
            db.session.add(product)
            db.session.flush()
    
            inventory = Inventory(
                product_id=product.id,
                warehouse_id=warehouse_id,
                quantity=initial_quantity
            )
            db.session.add(inventory)
            db.session.commit()
    
            logging.info(f"Product created: SKU={sku}, ID={product.id}")
            return jsonify({
                "message": "Product created successfully",
                "product_id": product.id,
                "sku": sku
            }), 201
    
        except IntegrityError as e:
            db.session.rollback()
            logging.error(f"Database integrity error: {e}")
            return jsonify({"error": "Database constraint violation"}), 400
    
        except Exception as e:
            db.session.rollback()
            logging.error(f"Unexpected error: {e}")
            return jsonify({"error": "Internal server error"}), 500
