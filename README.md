# cool-portal

## Installation

Clone the repository and install the node.js dependencies:

    git clone https://github.com/3rwww1/cool-portal/
    cd cool-portal
    npm install

## Configuration

Create a `.env` file in your working copy:
    
    touch .env
    echo "ES_URL=https://my-elasticsearch-host:my-port/" >> .env
    echo "ES_INDEX=my_es_index" >> .env
    echo "ES_TYPE=my_es_type" >> .env
    echo "LISTEN_PORT=3000" >> .env
    
## Running

    node app.js
