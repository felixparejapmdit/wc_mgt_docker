class DirectusApi {
    constructor() {
        this.baseUrl = 'http://172.18.162.62:8055';
        this.token = '-QIjtBjqqo360W4Vfj_2rkXmuLL_W7vJ';
    }

    async #request(method, path, data = null, headers = {}) {
        const url = `${this.baseUrl}${path}`;
        const defaultHeaders = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...headers
        };

        const config = {
            method,
            headers: defaultHeaders,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    async getAllItems(collection, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const path = `/items/${collection}?${queryString}`;
        const response = await this.#request('GET', path);
        return response.data;
    }

    async getItem(collection, id) {
        const path = `/items/${collection}/${id}`;
        const response = await this.#request('GET', path);
        return response.data;
    }

    async createItem(collection, data) {
        const path = `/items/${collection}`;
        const response = await this.#request('POST', path, data);
        return response.data;
    }

    async updateItem(collection, id, data) {
        const path = `/items/${collection}/${id}`;
        const response = await this.#request('PATCH', path, data);
        return response.data;
    }

    async deleteItem(collection, id) {
        const path = `/items/${collection}/${id}`;
        await this.#request('DELETE', path);
        return true;
    }

    async deleteAllItems(collection) {
        // Directus API does not have a bulk delete, so we get all IDs and delete them one by one.
        const items = await this.getAllItems(collection, { fields: 'id' });
        const ids = items.map(item => item.id);
        const path = `/items/${collection}?keys=${ids.join(',')}`;
        await this.#request('DELETE', path, null, { 'Content-Type': 'application/json' });
        return true;
    }

    async uploadFile(formData) {
        const path = '/files';
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        return response.json();
    }
}

const directusApi = new DirectusApi();