/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('user_rights').del()


  // Get the actual user and right IDs from the database
  const david = await knex('users').where('email', 'david@gmail.com').first();
  const alex = await knex('users').where('email', 'alex@gmail.com').first();
  const customerRight = await knex('rights').where('right_code', 1).first();
  const alexRight = await knex('rights').where('right_code', 2).first();
  await knex('user_rights').insert([
    { id: 1, user_id: david.id, right_id: customerRight.id },
    { id: 2, user_id: alex.id, right_id: alexRight.id }
  ]);
};
