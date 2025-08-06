A) as vanilla as possible
B) full stack feature-sliced architecture
C) one way dependency hierarchy (never depend on larger or same level components)
D) no sneaky coupling (shared state, events, API contracts, passing complex objects, ...)


tl;dr: build self contained features that include both backend and frontend code, strongly decoupled from other features. This solves most problems you would usually need a framework for. Build vanilla without frameworks, which allows you to work outside the backend-frontend paradigm. End up with simple, fast, code with fast learning curve, no black boxes, and fewer dependency risks.


1. build as vanilla as possible
- most frameworks add complexity to solve problems we don't have
- removes black boxes from codebase
- allows collaborating with smallest common denominator of developer skills (we all know JS)

2. tightly couple data models and UI
- historically, we separate backend from frontend, and tightly couple each. 
- however ui components are inherently coupled to the data they display
- as a result, everything ends up connected to everything else
- for rapid prototyping especially, tightly coupling data models with their UI components allows us to iterate super fast
- example: we build a user database with ui components to log in / log out and view profile. Usually, the backend would be tightly coupled with the rest of the app, and the frontend as well. Instead, we pay the price of tightly coupling the user database with the UI, but keep everything related to the user separate from everything else. Now we can copy the user feature from one project to another very cheaply.

3. tighly couple data and ui even more tightly
- for example: user-model + user-ui-components in a single service.
- they depend on each other *anyway*. Any small change in the model will require a change in the component, and often vice versa. Let's just make it explicit. And put them in the same folder. And make a real effort to keep them decoupled from everything else.


## llm instructions to adhere to philosophy

1. **Minimize Complexity**

   - Keep functions small and focused
   - Avoid unnecessary abstractions and layers
   - Every line of code must justify its existence

2. **Avoid External Dependencies**

   - Use native Web Components instead of JS frameworks
   - Rely on built-in browser and Node.js capabilities when possible
   - Each new dependency must be thoroughly justified

3. **Feature Parsimony**

   - Only implement features that are truly necessary
   - Regularly evaluate and remove unused or rarely used functionality
   - Question the necessity of each feature before implementation

4. **Simplification First**

   - Before adding new code, look for ways to simplify existing architecture
   - Attempt to solve problems by removing code rather than adding more
   - Refactor towards simpler solutions whenever possible

5. **Strictly Hierarchical Decoupling**

   - Higher-level components may depend on lower-level ones, never the reverse
   - Avoid bidirectional dependencies
   - Package components as full-stack vertical slices

6. **Vertical Full-Stack Organization**

   - Group code by feature/component rather than by technical layer
   - Keep a component's backend and frontend code together
   - Each component should be self-contained and autonomous

7. **Manage All Dependencies**

   - Identify and document all forms of coupling
   - Consider API contracts, data structures, events, and shared state as dependencies
   - Be especially vigilant about hidden dependencies

8. **Write Intentional Code**

   - Remove commented code
   - Eliminate dead code paths
   - Refactor verbose code to be more concise

9. **Minimal Testing Overhead**

   - Focus on critical path testing
   - Avoid test-for-test's sake approaches
   - Balance testing with added complexity

10. **Simplicity Over Extensibility**

    - Build for current needs with clean, readable code
    - Avoid complex "future-proof" designs
    - Prefer simple concrete implementations over complex abstractions

11. **Deliberate Documentation**

    - Document only what's necessary and non-obvious
    - Use self-documenting code with clear names
    - Document complex behaviors and architectural decisions

12. **Shared Understanding**
    - Keep the system small enough that any developer can comprehend it all
    - Avoid specialized knowledge silos
    - Maintain a low bus factor

## Implementation Guidelines

- When adding new features, first consider if they can be achieved by simplifying existing code
- Before introducing a new dependency, evaluate if native capabilities can accomplish the same goal
- Review code regularly to identify and remove unused features or dead code paths
- Organize new components as vertical slices that include both frontend and backend code
- Document architectural decisions that aren't immediately obvious from the code itself
- Maintain a codebase that any team member can fully understand
