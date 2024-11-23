import { Box, Flex, Button, Stack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <Box bg="white" px={4} boxShadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Box fontWeight="bold" fontSize="xl" color="pink.500">
          Heartbeat
        </Box>

        <Stack direction="row" spacing={4}>
          <Button colorScheme="pink" variant="ghost">
            Login
          </Button>
          <Button colorScheme="pink">
            Sign Up
          </Button>
        </Stack>
      </Flex>
    </Box>
  );
};

export default Header;