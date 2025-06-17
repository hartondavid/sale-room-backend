exports.up = function (knex) {
  return knex.schema.createTable('orders', function (table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('country', 255).nullable();
    table.string('city', 255).nullable();
    table.string('street', 255).nullable();
    table.string('house_number', 255).nullable();
    table.string('apartment_number', 255).nullable();
    table.string('floor', 255).nullable();
    table.string('postal_code', 255).nullable();
    table.string('phone', 255);;
    table.decimal('total', 10, 2).notNullable();
    table.boolean('is_paid').defaultTo(false);
    table.boolean('is_delivered').defaultTo(false);

    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('orders');
};
