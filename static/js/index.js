// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        posts: [], // See initialization.
    };

    app.index = (a) => {
        // Adds to the posts all the fields on which the UI relies.
        let i = 0;
        for (let p of a) {
            p._idx = i++;
            // TODO: Only make the user's own posts editable.
            let cmp = p.author.localeCompare(author_name);

            if(cmp == 0) {
                p.editable = true;
            }
            else {
                p.editable = false;
            }
            p.edit = false;
            p.is_pending = false;
            p.error = false;
            p.original_content = p.content; // Content before an edit.
            p.server_content = p.content; // Content on the server.
        }
        return a;
    };

    app.forceUpdate = () => {
        app.vue.posts.push(null);
        app.vue.posts.pop();
    }

    app.reindex = () => {
        // Adds to the posts all the fields on which the UI relies.
        let i = 0;
        for (let p of app.vue.posts) {
            p._idx = i++;
        }
    };

    app.do_edit = (post_idx) => {
        // Handler for button that starts the edit.
        // TODO: make sure that no OTHER post is being edited.
        // If so, do nothing.  Otherwise, proceed as below.
        let p = app.vue.posts[post_idx];
        if (p.editable == false) {
            p.edit = false;
        }
        else {
            p.edit = true;
        }
        app.vue.forceUpdate()
        p.is_pending = false;
    };

    app.do_cancel = (post_idx) => {
        // Handler for button that cancels the edit.
        let p = app.vue.posts[post_idx];
        if (p.id === null) {
            // If the post has not been saved yet, we delete it.
            app.vue.posts.splice(post_idx, 1);
            app.reindex();
        } else {
            // We go back to before the edit.
            p.edit = false;
            p.is_pending = false;
            p.content = p.server_content;
            app.forceUpdate();
        }
    }

    app.do_save = (post_idx) => {
        // Handler for "Save edit" button.
        let p = app.vue.posts[post_idx];
        if (p.content !== p.server_content) {
            p.is_pending = true;
            axios.post(posts_url, {
                content: p.content,
                id: p.id,
                is_reply: p.is_reply,
            }).then((result) => {
                console.log("Received:", result.data);
                // TODO: You are receiving the post id (in case it was inserted),
                // and the content.  You need to set both, and to say that
                // the editing has terminated.
                p.server_content = result.data.content;
                p.content = p.server_content;
                p.id = result.data.id;
                p.author = result.data.author;
                p.is_pending=false;
                p.edit = false;
                p.editable = true;
                app.forceUpdate();
            }).catch(() => {
                p.is_pending = false;
                console.log("Caught error");
                // We stay in edit mode.
            });
        } else {
            // No need to save.
            p.edit = false;
            p.original_content = p.content;
            app.forceUpdate();
        }
    }

    app.add_post = () => {
        // TODO: this is the new post we are inserting.
        // You need to initialize it properly, completing below, and ...
        let q = {
            id: null,
            edit: true,
            editable: null,
            content: "",
            server_content: null,
            original_content: "",
            author: author_name,
            email: null,
            is_reply: null,
        };
        // TODO:
        // ... you need to insert it at the top of the post list.
        app.vue.posts.unshift(q);
        app.reindex();
    };

    app.reply = (post_idx) => {
        let p = app.vue.posts[post_idx];
        if (p.id !== null) {
            // TODO: this is the new reply.  You need to initialize it properly...
            let q = {
                id: null,
                edit: true,
                editable: null,
                content: "",
                server_content: null,
                original_content: "",
                author: author_name,
                email: null,
                is_reply: p.id,
            };
            // TODO: and you need to insert it in the right place, and reindex
            // the posts.  Look at the code for app.add_post; it is similar.
            app.vue.posts.splice(post_idx+1,0,q);
            app.reindex();
        }
    };

    app.do_delete = (post_idx) => {
        let p = app.vue.posts[post_idx];
        if (p.id === null) {
            // TODO:
            // If the post has never been added to the server,
            // simply deletes it from the list of posts.
            app.vue.posts.splice(post_idx, 1);
            app.reindex(app.vue.posts);
        } else {
            // TODO: Deletes it on the server.
            axios.post(delete_url, {id: p.id}).then(() => {
                app.vue.posts.splice(post_idx,1);
                app.reindex(app.vue.posts);
            })
        }
    };

    // reorder posts so replies are under the corresponding main posts
    app.reorder = (posts) => {
        let main_posts = [];
        let replies = [];
        for (let p of posts) {
            if (p.is_reply == null) {
                main_posts.push(p);
            }
            else {
                replies.push(p);
            }
        }
        main_posts.sort(function(a, b){return a-b});
        replies.reverse();
        let copy = main_posts;
        for (let r of replies) {
            for (let p of main_posts) {
                if (r.is_reply == p.id) {
                    main_posts.splice(main_posts.indexOf(p)+1,0,r);
                }
            }
        }
        return main_posts;
    }

    // We form the dictionary of all methods, so we can assign them
    // to the Vue app in a single blow.
    app.methods = {
        do_edit: app.do_edit,
        do_cancel: app.do_cancel,
        do_save: app.do_save,
        add_post: app.add_post,
        reply: app.reply,
        do_delete: app.do_delete,
        forceUpdate: app.forceUpdate,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        // TODO: Load the posts from the server instead.
        // We set the posts.
        axios.get(posts_url).then(function (result) {
            let posts = result.data.posts;
            app.vue.posts=posts;
            let a = app.reorder(app.vue.posts);
            app.vue.posts = a;
            app.index(app.vue.posts);
        });
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
