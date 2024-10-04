import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface TagDoc extends BaseDoc {
  item: ObjectId;
  tags: string[];
}

/**
 * concept: Tagging [Item]
 */
export default class TaggingConcept {
  public readonly tags: DocCollection<TagDoc>;

  /**
   * Make an instance of Tagging.
   */
  constructor(collectionName: string) {
    this.tags = new DocCollection<TagDoc>(collectionName);
  }

  private async create(item: ObjectId, tags: string[]) {
    const _id = await this.tags.createOne({ item, tags });
    return { msg: "Tags created successfully!", _id };
  }

  private async ensureCreated(item: ObjectId) {
    if (!(await this.tags.readOne({ item }))) {
      await this.create(item, []);
    }
  }

  async delete(item: ObjectId) {
    await this.ensureCreated(item);
    await this.tags.deleteOne({ item });
    return { msg: "Tags deleted successfully!" };
  }

  async addTags(item: ObjectId, tags: string[]) {
    await this.ensureCreated(item);
    await this.tags.collection.updateOne({ item }, { $addToSet: { tags: { $each: tags } } });
    return { msg: "Tags successfully updated!" };
  }

  async deleteTags(item: ObjectId, tags: string[]) {
    await this.ensureCreated(item);
    await this.tags.collection.updateOne({ item }, { $pull: { tags: { $in: tags } } });
    return { msg: "Tags deleted successfully!" };
  }

  async getTagsForId(item: ObjectId) {
    await this.ensureCreated(item);
    const tags = await this.tags.readOne({ item });
    return tags?.tags ?? [];
  }
}
