
## Routing system

#### /users 
```

- POST:   .../c         --> signup / signin route, expect a body with email and password, 
                            if successful return 200 and the new user
- POST:   .../g         --> signup / signin route, using google auth system. 
                            expect a body idToken field, if successful return 200, the new user & it's google id.
- POST:   .../f         --> signup / signin route, using facebook auth system.
                            in dev-mode.                            
- GET:    .../me        --> [must be authenticate] get user route, expect a vaild token, 
                            if successful return 200 and the logged user.
- DELETE: .../me/token  --> [must be authenticate] sign out route, expect a vaild token and deleting it, 
                            if successful return 200.
```
#### /users/cart 
```
- POST:   .../          --> [must be authenticate]
- GET:    .../          --> [must be authenticate]
- DELETE: .../:pid      --> [must be authenticate]
```
#### /users/wish 
```
- POST:   .../          --> [must be authenticate]
- GET:    .../          --> [must be authenticate]
- DELETE: .../:pid      --> [must be authenticate]
``` 
#### /product 
```
- POST:   .../                --> [must be Admin authenticate]
- GET:    .../:pid
- DELETE: .../:pid            --> [must be Admin authenticate]
- GET:    .../cat/:category
- GET:    .../filter/:q
```    
    
## Main object models 

#### User model :
* email - regular email filed.
* password - regular password filed (will be only whan user provider = 'custom').
* provider - stands for the auth system the user signup with. can be 'costum' / 'google' / 'facebook'.
* roll - the roll of the user, standard/admin.
* tokens - array of authentication tokens given to the user.
* cartId - the user shopping cart id.
* wishList - array of the products id the user added to his wish list.


#### Product model :
* pCode - the product barcode.
* price - ..
* category - ..
* description - ..
* measurement - array of the product measurements, e.g 'S', 'M'.
* createDate - the date the product first showen on the app.
* onSale - yes/no does this product on sale.
* newIn - yes/no does this product considered new.
* season - ..
* brand - ..
* ImagePath - path / url for the product image.


#### Cart model :
* ownerId - the ObjectID of the user own this cart.
* contant - array of items, each one represent a product. item contain the fileds productId, insertionDate and the size (measurement of the product added)




## API in depth
##### /user/c
