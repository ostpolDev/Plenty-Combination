import knex from "knex";

// Setup the Knex database connection
const Knex = knex({
    client: "pg",
    connection: { // All of the environment variables
        host: process.env.ELEMENT_HOST,
        port: process.env.ELEMENT_PORT || 5432,
        user: process.env.ELEMENT_USER,
        password: process.env.ELEMENT_PASSWORD,
        database: process.env.ELEMENT_DATABASE
    }
})

// Check if tables need to be created
async function CheckTables() {

    let hasElements = await Knex.schema.hasTable("Elements");
    if (!hasElements) { // Create the Elements table if it doesn't exist
        await Knex.schema.createTable("Elements", (table) => {
            table.string("id").primary();
            table.string("name").notNullable();
            table.string("emoji");
            table.string("element_a");
            table.string("element_b");
            table.timestamps(true, true);
        });
    }

}
CheckTables();

export {Knex}
