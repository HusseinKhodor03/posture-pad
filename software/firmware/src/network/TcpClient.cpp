#include "TcpClient.h"

TcpClient::TcpClient(WiFiClient &client) : client(client) {}

bool TcpClient::send(const String &data)
{
    if (!client.connected())
        return false;

    client.println(data);
    return true;
}