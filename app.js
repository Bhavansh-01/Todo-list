//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose=require('mongoose');
const _=require('lodash');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-Bhavansh:test123@cluster0.n1zqj3m.mongodb.net/todolistDB");

const itemsSchema=mongoose.Schema({
  name: String
})

const Item=mongoose.model("Item",itemsSchema);


const listSchema=mongoose.Schema({
  name:String,
  items:[itemsSchema]
})

const List=mongoose.model("List",listSchema);

const item1=new Item({
  name:"Welcome to your todo list!!"
})
const item2=new Item({
  name:"Add the + button to add more items in your list"
}) 
const item3=new Item({
  name:"<--click here to strike them off"
})

const defaultItems=[item1,item2,item3];

let foundItems = [];

async function getItems() {
  const newItems = [];
  console.log("Fetching data, please wait...");
  await Item.collection.find({}, function(err, cursor) {
    cursor.forEach(function(document) {
      newItems.push(document);
    });
  });
  return newItems;
}

async function checkItems() {
  try {
    const count = await Item.collection.countDocuments();
    if (count === 0) {
      await Item.collection.insertMany(defaultItems);
      console.log("The data has been successfully inserted in DB");
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteItem(id) {
  try {
    await Item.findByIdAndRemove(id);
    console.log("Successfully deleted checked item.");
  } catch (err) {
    console.error(err);
  }
}

app.get("/", async function(req, res) {
  await checkItems();
  const listName = "Today"; // The list name to use for default items
  const foundList = await List.findOne({ name: listName });

  if (!foundList) {
    // Create a new list with default items
    const newList = new List({
      name: listName,
      items: defaultItems
    });
    await newList.save();
    res.redirect("/");
  } else {
    // Found an existing list, render the list with its items
    const allItems = await Item.find({}); // Retrieve all items from the database
    foundList.items = allItems; // Assign all items to the found list
    await foundList.save(); // Save the updated list with all items
    res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
  }
});




async function findListAndAddItem(listName, item) {
  try {
    const foundList = await List.findOne({ name: listName });
    if (foundList) {
      foundList.items.push(item);
      await foundList.save();
    }
    return foundList;
  } catch (err) {
    console.error(err);
    return null;
  }
}

app.post("/", async function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    try {
      await item.save();
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    try {
      const foundList = await findListAndAddItem(listName, item);
      if (foundList) {
        res.redirect("/" + listName);
      } else {
        const newList = new List({
          name: listName,
          items: [item]
        });
        await newList.save();
        res.redirect("/" + listName);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
});

async function findListAndRemoveItem(listName, checkedItemId) {
  try {
    const foundList = await List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } }
    );
    return foundList;
  } catch (err) {
    console.error(err);
    return null;
  }
}

app.post("/delete", async function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    try {
      await deleteItem(checkedItemId);
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    try {
      const foundList = await findListAndRemoveItem(listName, checkedItemId);
      if (foundList) {
        res.redirect("/" + listName);
      } else {
        res.status(404).send("List not found");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
});



async function finder(customListName, res) {
  try {
    const foundList = await List.collection.findOne({ name: customListName });

    if (!foundList) {
      // Creating a new list
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      
      await list.save();
      res.redirect("/"+customListName);
    } else {
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.error(err);
  }
}


app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  await finder(customListName, res);
});


app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
