
## Routing system

#### /users 
```

- POST:   .../c         --> signup / signin route, expect a body with email and password, 
                            if successful return 200 and the new user
- POST:   .../g         --> signup / signin route, using google auth system. 
                            expect a body idToken field, if successful return 200, the new user & it's google id.
- POST:   .../f         --> signup / signin route, using facebook auth system.
                            in dev-mode.      
- POST:   .../data      --> [must be authenticate] submit / update user data,
                            expect a body with user data, if successful return 200.
- GET:    .../me        --> [must be authenticate] get user route, expect a vaild token and provider, 
                            if successful return 200 and the logged user data.
- DELETE: .../me/token  --> [must be authenticate] sign out route, expect a vaild token and provider, and than deleting the token, 
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
* personalData - contains the fields firstName, lastName, birthDate, gender.
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
* #### POST /user/c :
    * *expect* - body : { email, password, data? }
                 if the request is for signin data = undefinde, if is for signup the data coulde be with value or undefinde.  
    * *return* - header : { 'x-auth': token }, body : { data : {signin?, signup?, user, tokenData } } 
    * *description* - 
  
  
* #### POST /user/g :
    * *expect* - body : { idToken }
                 if the request is for signin data = undefinde, if is for signup the data coulde be with value or undefinde.  
    * *return* - body : { data : {signin?, signup?, user, userId } } 
    * *description* - 
  
  
* #### POST /user/f :
    * *expect* -   
    * *return* -  
    * *description* - 
  
  
* #### POST /user/data :
    * *expect* - header : { x-auth : token, x-provider: provider }, body : { data : { firstName?, lastName?, birthDate?, gender? } }.
    * *return* - None
    * *description* - **authenticate route** 
    
    
* #### GET /user/me :
    * *expect* - header : { x-auth : token, x-provider: provider }.
    * *return* - body : { data : { authValue, user : { firstName?, lastName?, birthDate?, gender? } }.
    * *description* - **authenticate route** .
    * *notes* - the purpose of authValue is to authenticate the resonse of the server.  



## Authentication Notes
any authenticate route must recieve in the request two headers, 'x-auth' that contains the token that the logged user holding, and 'x-provider' that equals to the provider that supply the token.

