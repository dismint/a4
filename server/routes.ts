import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Friending, Posting, Sessioning, Tagging, Webapping } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  // New synchronizations for Midpoint

  @Router.get("/status")
  async getStatus() {
    return { msg: "Server is running! " };
  }

  @Router.put("/webapp")
  async addWebapp(session: SessionDoc, name: string, description: string, url: string) {
    const user = Sessioning.getUser(session);
    return await Webapping.create(user, name, description, url);
  }

  @Router.get("/webapp/view/all")
  async viewAllWebapps(session: SessionDoc, sup: string) {
    console.log(sup);
    const user = Sessioning.getUser(session);
    return await Webapping.getByUser(user);
  }

  @Router.delete("/webapp")
  async deleteWebapp(session: SessionDoc, _id: string) {
    // TODO: doesn't use the user name for anything, need to change in final
    const user = Sessioning.getUser(session);
    return await Webapping.delete(new ObjectId(_id));
  }

  @Router.patch("/webapp")
  async patchWebapp(session: SessionDoc, _id: string, name?: string, description?: string, url?: string) {
    // TODO: same as above
    const user = Sessioning.getUser(session);
    if (name) {
      await Webapping.setName(new ObjectId(_id), name);
    }
    if (description) {
      await Webapping.setDescription(new ObjectId(_id), description);
    }
    if (url) {
      await Webapping.setUrl(new ObjectId(_id), url);
    }
    return { msg: "Webapp updated!" };
  }

  @Router.post("/tag/add")
  async addTagsToWebapp(session: SessionDoc, _id: string, tags: string) {
    // TODO: same as above
    const user = Sessioning.getUser(session);
    return await Tagging.addTags(new ObjectId(_id), tags.split(","));
  }

  @Router.post("/tag/delete")
  deleteTagsFromWebapp(session: SessionDoc, _id: string, tags: string) {
    // TODO: same as above
    const user = Sessioning.getUser(session);
    return Tagging.deleteTags(new ObjectId(_id), tags.split(","));
  }

  @Router.get("/tag/view/:_id")
  async viewTagsForWebapp(session: SessionDoc, _id: string) {
    // TODO: same as above
    const user = Sessioning.getUser(session);
    return Tagging.getTagsForId(new ObjectId(_id));
  }

  @Router.get("/tag/filter/:tag")
  async filterWebappsByTag(session: SessionDoc, tag: string) {
    const user = Sessioning.getUser(session);
    const webapps = await Webapping.getByUser(user);
    const filtered = webapps.filter(async (webapp) => {
      const tags = await Tagging.getTagsForId(webapp._id);
      return tags.includes(tag);
    });
    return filtered;
  }

  // RESTFUL Drafts for Midpoint

  //@Router.get("/user/toptags")
  //async userTopTags(username: string) {
  //  this function will sync and get the top tags for a user
  //}

  //@Router.get("/user/topwebapps")
  //async userTopWebapps(session: SessionDoc) {
  //  this function will sync and get the top webapps for a user
  //}

  //@Router.get("/user/topwebapps/:tag")
  //async userTopWebappsByTag(session: SessionDoc, tag: string) {
  //  this function will sync and get the top webapps for a user by tag
  //}

  //@Router.get("/posts")
  //async getPosts() {
  //  this function will sync and get all posts using the Posting concept
  //  that is yet to be implemented
  //}

  // END RESTFUL Drafts for Midpoint
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
