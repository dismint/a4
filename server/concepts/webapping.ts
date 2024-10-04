import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface WebappDoc extends BaseDoc {
  user: ObjectId;
  name: string;
  description: string;
  url: string;
}

/**
 * concept: Webapping
 */
export default class WebappingConcept {
  public readonly webapps: DocCollection<WebappDoc>;

  /**
   * Make an instance of Webapping.
   */
  constructor(collectionName: string) {
    this.webapps = new DocCollection<WebappDoc>(collectionName);
  }

  async create(user: ObjectId, name: string, description: string, url: string) {
    const _id = await this.webapps.createOne({ user, name, description, url });
    return { msg: "Webapp created successfully!", _id };
  }

  async delete(_id: ObjectId) {
    await this.webapps.deleteOne({ _id });
    return { msg: "Webapp deleted successfully!" };
  }

  async setName(_id: ObjectId, name: string) {
    await this.webapps.partialUpdateOne({ _id }, { name });
    return { msg: "Webapp name updated!" };
  }

  async setDescription(_id: ObjectId, description: string) {
    await this.webapps.partialUpdateOne({ _id }, { description });
    return { msg: "Webapp description updated!" };
  }

  async setUrl(_id: ObjectId, url: string) {
    await this.webapps.partialUpdateOne({ _id }, { url });
    return { msg: "Webapp URL updated!" };
  }

  async getByUser(user: ObjectId) {
    return await this.webapps.readMany({ user });
  }
}
