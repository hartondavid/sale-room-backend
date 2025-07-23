/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('rights').del()
  await knex('rights').insert([
    { name: 'customer', right_code: 1 },
    { name: 'seller', right_code: 2 }
  ]);
}
