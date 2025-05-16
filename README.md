# vex


### Developer Guide

- keep it as vanilla as possible
- keep all logic (back to front) related to a feature in one place
- dependency graph must be a tree. 

### Shared services
(exceptions to the tree rule)
- services/utils/livemodelelement
- services/utils/reactive
- services/utils/io
- services/users

### Depenency tree

(nothing should show up more than once)
(lower levels must not know about upper levels)
```

server.js
├── users
|── vertex
|   ├── users
|   ├── reactions
|   |   ├── utils
|   |── utils
|-- utils
|-- geodata
|-- database
