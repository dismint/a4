import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Friending, Posting, Sessioning, Tagging, Webapping, Graphing } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import { WrongUserError } from "./concepts/errors";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  // BEGIN RESTFUL API

  @Router.get("/status")
  async getStatus() {
    return { msg: "Server is running! " };
  }

  /**
   * Create New Webapp
   * @param session: User Session
   * @param name: Webapp Name
   * @param description: Webapp Description
   * @param url: Webapp URL
   * @returns: Webapp Object
   **/
  @Router.put("/webapp")
  async addWebapp(session: SessionDoc, name: string, description: string, url: string) {
    const user = Sessioning.getUser(session);
    const webappResult = await Webapping.create(user, name, description, url);
    await Graphing.addNode(webappResult._id, user);
    Posting.create(user, `Created webapp ${webappResult._id}`);
    return webappResult;
  }

  /**
   * View All Webapps
   * @param session: User Session
   * @returns: Array of Webapp Objects
   **/
  @Router.get("/webapp/view/all")
  async viewAllWebapps(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Webapping.getByUser(user);
  }

  /**
   * View One Webapp
   * @param session: User Session
   * @param _id: Webapp ID
   * @returns: Webapp Object
   **/
  @Router.get("/webapp/view")
  async viewWebapp(session: SessionDoc, _id: string) {
    const user = Sessioning.getUser(session);
    return await Webapping.getById(new ObjectId(_id));
  }

  /**
   * Delete a Webapp
   * @param session: User Session
   * @param _id: Webapp ID
   * @returns: Success Message
   **/
  @Router.delete("/webapp")
  async deleteWebapp(session: SessionDoc, _id: string) {
    const user = Sessioning.getUser(session);
    if ((await Webapping.getOwner(new ObjectId(_id))) !== user.toString()) {
      throw new WrongUserError("You do not own this webapp!");
    }

    const webappResult = await Webapping.delete(new ObjectId(_id));
    await Graphing.deleteNode(new ObjectId(_id));
    Posting.create(user, `Deleted webapp ${_id}`);
    return webappResult;
  }

  /**
   * Update a Webapp
   * @param session: User Session
   * @param _id: Webapp ID
   * @param name: New Webapp Name (optional)
   * @param description: New Webapp Description (optional)
   * @param url: New Webapp URL (optional)
   * @returns: Success Message
   **/
  @Router.patch("/webapp")
  async patchWebapp(session: SessionDoc, _id: string, name?: string, description?: string, url?: string) {
    const user = Sessioning.getUser(session);
    if ((await Webapping.getOwner(new ObjectId(_id))) !== user.toString()) {
      throw new WrongUserError("You do not own this webapp!");
    }
    if (name) {
      await Webapping.setName(new ObjectId(_id), name);
    }
    if (description) {
      await Webapping.setDescription(new ObjectId(_id), description);
    }
    if (url) {
      await Webapping.setUrl(new ObjectId(_id), url);
    }
    Posting.create(user, `Updated webapp ${_id}`);
    return { msg: "Webapp updated!" };
  }

  /**
   * Add Tags to Webapp
   * @param session: User Session
   * @param _id: Webapp ID
   * @param tags: Comma-separated list of tags
   * @returns: Success Message
   **/
  @Router.post("/tag/add")
  async addTagsToWebapp(session: SessionDoc, _id: string, tags: string) {
    const user = Sessioning.getUser(session);
    if ((await Webapping.getOwner(new ObjectId(_id))) !== user.toString()) {
      throw new WrongUserError("You do not own this webapp!");
    }
    const tagResult = await Tagging.addTags(new ObjectId(_id), tags.split(","));
    const neighbors = await Webapping.getByUser(user);
    const matching = await Tagging.getMatchingItems(
      new ObjectId(_id),
      neighbors.map((w) => w._id),
    );
    await Graphing.updateEdgesForUserNode(
      user,
      new ObjectId(_id),
      matching.map((w) => w.item.toString()),
    );
    Posting.create(user, `Added tags ${tags} to webapp ${_id}`);
    return tagResult;
  }

  /**
   * Remove Tags from Webapp
   * @param session: User Session
   * @param _id: Webapp ID
   * @param tags: Comma-separated list of tags
   * @returns: Success Message
   **/
  @Router.post("/tag/remove")
  async deleteTagsFromWebapp(session: SessionDoc, _id: string, tags: string) {
    const user = Sessioning.getUser(session);
    if ((await Webapping.getOwner(new ObjectId(_id))) !== user.toString()) {
      throw new WrongUserError("You do not own this webapp!");
    }
    const tagResult = await Tagging.deleteTags(new ObjectId(_id), tags.split(","));
    const neighbors = await Webapping.getByUser(user);
    const matching = await Tagging.getMatchingItems(
      new ObjectId(_id),
      neighbors.map((w) => w._id),
    );
    await Graphing.updateEdgesForUserNode(
      user,
      new ObjectId(_id),
      matching.map((w) => w.item.toString()),
    );
    Posting.create(user, `Removed tags ${tags} from webapp ${_id}`);
    return tagResult;
  }

  /**
   * View Tags for Webapp
   * @param session: User Session
   * @param _id: Webapp ID
   * @returns: Array of Tags
   **/
  @Router.get("/tag/view")
  async viewTagsForWebapp(session: SessionDoc, _id: string) {
    const user = Sessioning.getUser(session);
    return Tagging.getTagsForId(new ObjectId(_id));
  }

  /**
   * View Webapps Filtered by Tag for User
   * @param session: User Session
   * @param tag: Tag to filter by
   * @returns: Array of Webapp Objects
   **/
  @Router.get("/tag/filter")
  async filterWebappsByTag(session: SessionDoc, tag: string) {
    const user = Sessioning.getUser(session);
    const webapps = await Webapping.getByUser(user);
    const filtered = await Tagging.getItemsWithTag(
      webapps.map((w) => w._id),
      tag,
    );
    return filtered;
  }

  /**
   * Top Tags for User
   * @param session: User Session
   * @param limit: Number of tags to return
   * @returns: Array of Tags
   **/
  @Router.get("/user/top/tags")
  async userTopTags(session: SessionDoc, limit: number) {
    const user = Sessioning.getUser(session);
    const webapps = await Webapping.getByUser(user);
    return await Tagging.topTagsForItems(
      webapps.map((w) => w._id),
      limit,
    );
  }

  /**
   * Get Nodes That Belong to User
   * @param session: User Session
   * @returns: Array of Graph Nodes
   **/
  @Router.get("/graph/nodes")
  async getGraphNodes(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Graphing.getUserNodes(user);
  }

  // END RESTFUL API

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
