# AIchatBot

**steps to run the project on your local machine:**
1. you have to install compatable python version
  (python 3.6, 3.7, 3.8, 3.9)

2. **Clone the repository:**
      
      Run:
    ``` bash 
    git clone git@github.com:EliasDemlie/AIchatBot.git
3. **create vertual environment using python3.8**
   ```bash
    python3.8 -m venv <ur_vertual_environmentVariable_name>
4. **install all dependacies**
     
     run:
   ``` bash  
   pip install -r requirements.txt
5. **run the rasa server    expose to rest_api**

     run:
   ```bash
   rasa run --enable-api --cors "*" --port 5008
   rasa run --enable-api --cors "allowed_request_url" --port <portNo.>

   
6. **...**

--------------------------------------------------------------
 *references*

* to update/create the requirmwnts.txt   pip freeze > requirements.txt

* rasa doc about websocket connection
 https://rasa.com/docs/rasa/connectors/your-own-website#websocket-channel

--------------------------------------------------------------

