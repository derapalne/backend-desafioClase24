import faker from "@faker-js/faker";
faker.locale = "es";

export default class Mocker {
    constructor() {}

    generarProductos(cant) {
        const productosFake = [];
        for (let i = 0; i < cant; i++) {
            const title = faker.commerce.product();
            const prod = {
                title: title,
                price: Number(faker.commerce.price()),
                thumbnail: faker.image.imageUrl(256, 256, title),
            };
            productosFake.push(prod);
        }
        return productosFake;
    }
}
