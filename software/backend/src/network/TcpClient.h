#ifndef TCP_CLIENT_H
#define TCP_CLIENT_H

#include <WiFiClient.h>

class TcpClient
{
public:
    TcpClient(WiFiClient &client);
    bool send(const String &data);

private:
    WiFiClient &client;
};

#endif