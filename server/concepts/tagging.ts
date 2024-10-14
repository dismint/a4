import { ObjectId } from "mongodb";
import { DoesNotExistError } from "./errors";
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

  private async delete(item: ObjectId) {
    await this.ensureCreated(item);
    await this.tags.deleteOne({ item });
  }

  async addTags(item: ObjectId, tags: string[]) {
    await this.ensureCreated(item);
    await this.tags.collection.updateOne({ item }, { $addToSet: { tags: { $each: tags } } });
    return { msg: "Tags successfully updated!" };
  }

  async deleteTags(item: ObjectId, tags: string[]) {
    await this.ensureCreated(item);
    for (const tag of tags) {
      if (!(await this.tags.readOne({ item }))?.tags.includes(tag)) {
        throw new DoesNotExistError(`Tag ${tag} does not exist for item ${item}`);
      }
    }
    await this.tags.collection.updateOne({ item }, { $pull: { tags: { $in: tags } } });
    if ((await this.tags.readOne({ item }))?.tags.length === 0) {
      this.delete(item);
    }
    return { msg: "Tags deleted successfully!" };
  }

  async getMatchingItems(item: ObjectId, others: ObjectId[]) {
    await this.ensureCreated(item);
    const tags = await this.tags.readOne({ item });
    if (!tags) {
      return [];
    }
    const items = await this.tags.readMany({ item: { $in: others } });
    return items.filter((other) => other.tags.some((tag) => tags.tags.includes(tag)));
  }

  async getItemsWithTag(items: ObjectId[], targetTag: string) {
    console.log(items, targetTag);
    const tags = await this.tags.readMany({ item: { $in: items } });
    return tags.filter((tag) => tag.tags.includes(targetTag));
  }

  async topTagsForItems(items: ObjectId[], limit: number) {
    const tags = await this.tags.readMany({ item: { $in: items } });
    const tagCounts = tags.reduce(
      (acc, tag) => {
        for (const t of tag.tags) {
          acc[t] = (acc[t] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  async getTagsForId(item: ObjectId) {
    await this.ensureCreated(item);
    const tags = await this.tags.readOne({ item });
    return tags?.tags ?? [];
  }
}
