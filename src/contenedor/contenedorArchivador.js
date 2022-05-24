import knex from "knex";

export default class ContenedorArchivador {
    constructor(tableName, config) {
        this.tableName = tableName;
        this.knex = knex(config);
    }

    async save(data) {
        try {
            if (this.check(data)) {
                this.knex(this.tableName)
                    .insert(data)
                    .then(() => {
                        console.log("Guardado! =>", data);
                    })
                    .catch((e) => console.log(e));
                return true;
            } else {
                return false;
            }
        } catch (e) {
            throw new Error(e);
        }
    }
}
