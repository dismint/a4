import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface GraphDoc extends BaseDoc {
  item: ObjectId;
  neighbors: ObjectId[];
  owner: ObjectId;
}

/**
 * concept: Graphing [Item]
 */
export default class GraphingConcept {
  public readonly tags: DocCollection<GraphDoc>;

  /**
   * Make an instance of Graphing.
   */
  constructor(collectionName: string) {
    this.tags = new DocCollection<GraphDoc>(collectionName);
  }

  async addNode(item: ObjectId, owner: ObjectId) {
    await this.tags.createOne({ item, owner, neighbors: [] });
    return { msg: "Node successfully created!" };
  }

  async addEdge(from: ObjectId, to: ObjectId) {
    await this.tags.collection.updateOne({ item: from }, { $addToSet: { neighbors: to } });
    await this.tags.collection.updateOne({ item: to }, { $addToSet: { neighbors: from } });
    return { msg: "Edge successfully created!" };
  }

  async deleteNode(item: ObjectId) {
    await this.tags.deleteOne({ item });
    return { msg: "Node successfully deleted!" };
  }

  async deleteEdge(from: ObjectId, to: ObjectId) {
    await this.tags.collection.updateOne({ item: from }, { $pull: { neighbors: to } });
    await this.tags.collection.updateOne({ item: to }, { $pull: { neighbors: from } });
    return { msg: "Edge successfully deleted!" };
  }

  async updateEdgesForUserNode(user: ObjectId, item: ObjectId, connected: string[]) {
    const nodes = await this.tags.readMany({ owner: user });
    for (const node of nodes) {
      if (node.item.toString() !== item.toString()) {
        if (connected.includes(node.item.toString())) {
          await this.addEdge(item, node.item);
          await this.addEdge(node.item, item);
        } else {
          await this.deleteEdge(item, node.item);
          await this.deleteEdge(node.item, item);
        }
      }
    }
    return { msg: "Edges updated for user node!" };
  }

  async getUserNodes(user: ObjectId) {
    return await this.tags.readMany({ owner: user });
  }
}
