exports.up = function (knex) {
  return knex.schema.createTable('products', function (table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.decimal('initial_price', 10, 2).notNullable();
    table.decimal('current_price', 10, 2).notNullable();
    table.string('description', 255);
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['active', 'inactive', 'paid']).defaultTo('active');
    table.integer('current_user_id').nullable();
    table.string('photo').nullable();
    table.datetime('start_date').nullable();
    table.datetime('end_date').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('products');
};
